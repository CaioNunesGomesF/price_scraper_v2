import { createHash } from "node:crypto";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../../errors/app-error.js";
import { authenticate } from "../auth/auth.service.js";
import * as repository from "./equipment-analysis.repository.js";
import { analyzeEquipment } from "./equipment-analysis.llm.js";
import * as searchRepository from "../search/search.repository.js";
import * as partnerStoresService from "../partner-stores/partner-stores.service.js";
import type { CreateAnalysisInputDTO, AnalysisContextDTO } from "./equipment-analysis.zod.js";
import type { EquipmentCategorySlug } from "./equipment-analysis.schema.js";
import type { CreatePriceAlertDTO } from "./equipment-analysis.extra.zod.js";

const categoryAliases: Array<[string, string]> = [
  ["smartphone", "smartphone"], ["celular", "smartphone"], ["tablet", "tablet"], ["monitor", "monitor"], ["televis", "tv"], ["tv", "tv"], ["projetor", "projector"],
  ["notebook", "notebook"], ["laptop", "notebook"], ["servidor", "server"], ["computador", "computer"], ["desktop", "computer"], ["console", "console"], ["videogame", "console"],
  ["roteador", "network"], ["switch", "network"], ["wifi", "network"], ["teclado", "peripheral"], ["mouse", "peripheral"], ["headset", "peripheral"], ["webcam", "peripheral"],
  ["microfone", "peripheral"], ["impressora", "peripheral"], ["processador", "component"], ["cpu", "component"], ["placa de video", "component"], ["gpu", "component"], ["ssd", "component"], ["memoria", "component"], ["ram", "component"], ["fonte", "component"],
];

function inferCategory(input: string, explicit?: EquipmentCategorySlug) {
  if (explicit) return explicit;
  const normalized = input.toLocaleLowerCase("pt-BR");
  return (categoryAliases.find(([alias]) => normalized.includes(alias))?.[1] ?? null) as EquipmentCategorySlug | null;
}

function questionSet(context: AnalysisContextDTO, items: CreateAnalysisInputDTO["equipamentos"]) {
  const questions = [];
  if (!context.objective) questions.push({ id: "objetivo", question: "Para que você pretende usar o equipamento?", reason: "O uso define quais especificações realmente importam.", required: true });
  if (context.budgetBrl === undefined || context.budgetBrl === null) questions.push({ id: "orcamento", question: "Qual é o orçamento máximo em reais?", reason: "O orçamento muda a recomendação e o custo-benefício.", required: true });
  if (context.existingEquipment === undefined) questions.push({ id: "existente", question: "Você já possui algum equipamento que precisa ser mantido ou combinado?", reason: "Compatibilidade depende dos dados dos equipamentos envolvidos.", required: false });
  if (!items || items.length === 0) questions.push({ id: "equipamentos", question: "Quais modelos ou especificações devo analisar?", reason: "A análise precisa de pelo menos um equipamento.", required: true });
  return questions.slice(0, 3);
}

function subjectHash(value: string) { return createHash("sha256").update(value).digest("hex"); }

async function owner(authorization?: string, anonymousKey?: string) {
  if (authorization) {
    try { return { userId: (await authenticate(authorization)).userId, anonymousKeyHash: undefined }; }
    catch { throw new UnauthorizedError("Sua sessão expirou. Entre novamente ou continue como anônimo."); }
  }
  const stableKey = anonymousKey?.trim() || "ip-unavailable";
  return { userId: undefined, anonymousKeyHash: subjectHash(stableKey) };
}

async function getOwned(id: string, authorization?: string, anonymousKey?: string) {
  const identity = await owner(authorization, anonymousKey);
  const found = await repository.findOwnedAnalysis(id, identity.userId, identity.anonymousKeyHash);
  if (!found) throw new NotFoundError("Análise não encontrada.");
  return { identity, found };
}

function serialize(found: Awaited<ReturnType<typeof repository.findOwnedAnalysis>>) {
  if (!found) return null;
  return {
    id: found.session.id,
    input: found.session.rawInput,
    contexto: found.session.context,
    perguntas: found.session.clarificationQuestions,
    status: found.session.status,
    resumo: found.session.summary,
    resultado: found.session.result,
    modelo: found.session.modelName,
    modeloFallback: found.session.fallbackModelName,
    criadoEm: found.session.createdAt.toISOString(),
    atualizadoEm: found.session.updatedAt.toISOString(),
    equipamentos: found.items.map((item) => ({ id: item.id, nome: item.rawName, nomeNormalizado: item.normalizedName, confirmado: item.confirmed, specs: item.specifications, estimativas: item.estimates })),
    compatibilidade: found.compatibility,
    precos: [],
  };
}

export async function create(data: CreateAnalysisInputDTO, authorization?: string, anonymousKey?: string) {
  const identity = await owner(authorization, anonymousKey);
  if (!identity.userId) {
    const quota = await repository.consumeAnonymousQuota(identity.anonymousKeyHash!);
    if (!quota.allowed) throw new BadRequestError(`Limite anônimo diário atingido (${quota.limit} análises). Faça login para continuar.`);
  }
  const context = { ...data.contexto, region: "BR" as const };
  const items = data.equipamentos?.map((item) => ({ rawName: item.nome, confirmed: item.confirmado && item.origem === "busca" })) ?? [{ rawName: data.input, confirmed: false }];
  const category = inferCategory(`${data.input} ${items.map((item) => item.rawName).join(" ")}`, data.categoria);
  const categoryRow = category ? await repository.findCategory(category) : null;
  const analysisItems = data.equipamentos ?? [{ nome: data.input, origem: "manual" as const, confirmado: false }];
  const questions = questionSet(context, analysisItems);
  const session = await repository.createAnalysis({ ...identity, categoryId: categoryRow?.id, rawInput: data.input, context, normalizedInput: { categoria: category }, questions, items });
  const found = await repository.findOwnedAnalysis(session.id, identity.userId, identity.anonymousKeyHash);
  if (!found) throw new Error("Análise criada, mas não pôde ser recuperada.");
  if (questions.length === 0) await runOwned(session.id, identity.userId, identity.anonymousKeyHash);
  const final = await repository.findOwnedAnalysis(session.id, identity.userId, identity.anonymousKeyHash);
  return serialize(final);
}

export async function answer(id: string, answers: Array<{ questionId: string; answer: string }>, authorization?: string, anonymousKey?: string) {
  const { identity, found } = await getOwned(id, authorization, anonymousKey);
  const current = found.session.context as AnalysisContextDTO;
  for (const answer of answers) {
    if (answer.questionId === "objetivo" && answer.answer) current.objective = answer.answer;
    if (answer.questionId === "orcamento" && answer.answer) {
      const parsed = Number(answer.answer.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
      if (Number.isFinite(parsed) && parsed >= 0) current.budgetBrl = parsed;
    }
    if (answer.questionId === "existente") current.existingEquipment = answer.answer || null;
  }
  const remaining = questionSet(current, found.items.map((item) => ({ nome: item.rawName, origem: item.confirmed ? "busca" : "manual", confirmado: item.confirmed })));
  await repository.updateContext(id, current, remaining);
  if (remaining.length === 0) await runOwned(id, identity.userId, identity.anonymousKeyHash);
  return serialize(await repository.findOwnedAnalysis(id, identity.userId, identity.anonymousKeyHash));
}

async function runOwned(id: string, userId?: string, anonymousKeyHash?: string) {
  const found = await repository.findOwnedAnalysis(id, userId, anonymousKeyHash);
  if (!found) throw new NotFoundError("Análise não encontrada.");
  await repository.markProcessing(id);
  try {
    const result = await analyzeEquipment({
      category: (found.session.normalizedInput as { categoria?: string | null }).categoria ?? null,
      rawInput: found.session.rawInput,
      context: found.session.context,
      items: found.items.map((item) => ({ nome: item.rawName, confirmado: item.confirmed })),
    });
    await repository.saveResult(id, result.output, result.modelName, result.fallbackModelName);
  } catch (error) {
    await repository.markFailed(id, "Não foi possível concluir a análise agora.");
    throw error;
  }
}

export async function run(id: string, authorization?: string, anonymousKey?: string) {
  const { identity } = await getOwned(id, authorization, anonymousKey);
  await runOwned(id, identity.userId, identity.anonymousKeyHash);
  return serialize(await repository.findOwnedAnalysis(id, identity.userId, identity.anonymousKeyHash));
}

export async function get(id: string, authorization?: string, anonymousKey?: string) {
  const { found } = await getOwned(id, authorization, anonymousKey);
  return serialize(found);
}

export async function list(authorization?: string, anonymousKey?: string) {
  if (!authorization) throw new UnauthorizedError("Faça login para acessar o histórico de análises.");
  const identity = await owner(authorization, anonymousKey);
  const rows = await repository.listOwnedAnalyses(identity.userId);
  return rows.map((row) => ({ id: row.id, input: row.rawInput, status: row.status, summary: row.summary, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }));
}

export async function remove(id: string, authorization?: string, anonymousKey?: string) {
  const { identity } = await getOwned(id, authorization, anonymousKey);
  await repository.deleteOwnedAnalysis(id, identity.userId, identity.anonymousKeyHash);
}

export async function refreshPrices(id: string, authorization?: string, anonymousKey?: string) {
  const { identity, found } = await getOwned(id, authorization, anonymousKey);
  const settled = await Promise.all(found.items.map(async (item) => {
    const results = await Promise.allSettled([
      searchRepository.searchMercadoLivre(item.rawName),
      searchRepository.searchKabum(item.rawName),
      searchRepository.searchGoogleShopping(item.rawName),
      partnerStoresService.searchPartnerProducts(item.rawName),
    ]);
    const offers = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    await repository.savePriceObservations(id, item.id, offers);
    return { itemId: item.id, item: item.rawName, ofertas: offers };
  }));
  const prices = (await repository.listPriceObservations(id)).map((price) => ({ id: price.id, itemId: price.analysisItemId, title: price.title, price: price.priceCents / 100, currency: price.currency, seller: price.seller, url: price.url, observedAt: price.observedAt.toISOString(), expiresAt: price.expiresAt.toISOString(), availability: price.availability }));
  const triggered = await repository.triggerPriceAlerts(id, settled.flatMap((item) => item.ofertas.map((offer) => ({ price: offer.price, itemId: item.itemId }))));
  return { analysis: serialize(await repository.findOwnedAnalysis(id, identity.userId, identity.anonymousKeyHash)), atualizados: settled.map((item) => ({ itemId: item.itemId, item: item.item, quantidade: item.ofertas.length })), precos: prices, alertasAtingidos: triggered };
}

export async function createAlert(data: CreatePriceAlertDTO, authorization?: string) {
  const user = await authenticate(authorization);
  const { targetPriceBrl, ...alert } = data;
  return repository.createPriceAlert({ ...alert, userId: user.userId, targetPriceCents: Math.round(targetPriceBrl * 100) });
}

export async function listAlerts(authorization?: string) {
  const user = await authenticate(authorization);
  const rows = await repository.listPriceAlerts(user.userId);
  return rows.map((row) => ({ id: row.id, title: row.title, url: row.url, targetPriceBrl: row.targetPriceCents / 100, currency: row.currency, active: row.active, createdAt: row.createdAt.toISOString(), lastNotifiedAt: row.lastNotifiedAt?.toISOString() ?? null }));
}

export async function updateAlert(id: string, active: boolean, authorization?: string) {
  const user = await authenticate(authorization);
  const updated = await repository.updatePriceAlert(user.userId, id, active);
  if (!updated) throw new NotFoundError("Alerta não encontrado.");
  return { id: updated.id, active: updated.active };
}
