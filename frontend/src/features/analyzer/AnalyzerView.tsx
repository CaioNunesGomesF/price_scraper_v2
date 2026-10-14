import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../../shared/Icon";
import { answerAnalysis, createAnalysis, refreshPrices } from "./analyzer.api";
import { createPriceAlert, getProfile, importSource, type ImportedSource } from "./analyzer.extra.api";
import type { AnalyzerPrice, AnalyzerQuestion, AnalyzerSession, CompatibilityCheck } from "./analyzer.types";
import "./analyzer.css";

type Props = { token?: string; onLogin: () => void };
type Scenario = "jogos" | "trabalho" | "edicao" | "uso_casual" | "custo_beneficio";
type Category = { value: string; label: string; group: string };

const categories: Category[] = [
  { value: "", label: "Detectar automaticamente", group: "Geral" },
  { value: "monitor", label: "Monitor", group: "Imagem" }, { value: "tv", label: "TV", group: "Imagem" }, { value: "projector", label: "Projetor", group: "Imagem" },
  { value: "computer", label: "Computador", group: "Computação" }, { value: "notebook", label: "Notebook", group: "Computação" }, { value: "server", label: "Servidor", group: "Computação" },
  { value: "smartphone", label: "Celular", group: "Mobilidade" }, { value: "tablet", label: "Tablet", group: "Mobilidade" }, { value: "console", label: "Console", group: "Games" },
  { value: "peripheral", label: "Periférico", group: "Acessórios" }, { value: "network", label: "Rede", group: "Conectividade" }, { value: "component", label: "Componente", group: "Peças" },
];
const scenarioLabels: Record<Scenario, string> = { jogos: "Jogos", trabalho: "Trabalho", edicao: "Edição", uso_casual: "Uso casual", custo_beneficio: "Custo-benefício" };

function money(value: number) { return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`; }

function SearchableSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = categories.find((item) => item.value === value) ?? categories[0]!;
  const filtered = categories.filter((item) => `${item.label} ${item.group}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));

  useEffect(() => {
    function close(event: MouseEvent) { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function choose(next: string) { onChange(next); setQuery(""); setOpen(false); }

  return <div className={`analyzer-combobox${open ? " is-open" : ""}`} ref={rootRef}>
    <button className="analyzer-combobox-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <span className={selected.value ? "" : "is-placeholder"}>{selected.label}</span><span className="analyzer-combobox-chevron">⌄</span>
    </button>
    {open && <div className="analyzer-combobox-popover"><div className="analyzer-combobox-search"><Icon name="search" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); if (event.key === "Enter" && filtered[0]) choose(filtered[0].value); }} placeholder="Buscar categoria…" /></div><div className="analyzer-combobox-options" role="listbox">{filtered.length > 0 ? filtered.map((item) => <button className={item.value === value ? "is-selected" : ""} key={item.value} type="button" role="option" aria-selected={item.value === value} onClick={() => choose(item.value)}><span>{item.label}</span><small>{item.group}</small>{item.value === value && <Icon name="check" />}</button>) : <p className="analyzer-combobox-empty">Nenhuma categoria encontrada.</p>}</div></div>}
  </div>;
}

function DataBlock({ title, value }: { title: string; value: Record<string, unknown> }) {
  const entries = Object.entries(value);
  return <section className="analyzer-data-block"><div className="analyzer-section-title"><span>{title}</span><small>{entries.length ? `${entries.length} itens` : "não informado"}</small></div>{entries.length > 0 && <div className="analyzer-spec-list">{entries.map(([key, item]) => <div key={key}><span>{key.replace(/_/g, " ")}</span><strong>{typeof item === "object" ? JSON.stringify(item) : String(item)}</strong></div>)}</div>}</section>;
}

function StatusPill({ status }: { status: CompatibilityCheck["resultado"] }) {
  const labels = { compativel: "Compatível", incompativel: "Incompatível", parcial: "Parcial", indeterminado: "Indeterminado" };
  return <span className={`analyzer-status analyzer-status-${status}`}>{labels[status]}</span>;
}

function Questions({ questions, busy, onSubmit }: { questions: AnalyzerQuestion[]; busy: boolean; onSubmit: (answers: Array<{ questionId: string; answer: string }>) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  return <form className="analyzer-questions" onSubmit={(event) => { event.preventDefault(); onSubmit(questions.map((question) => ({ questionId: question.id, answer: answers[question.id] ?? "" }))); }}>
    <div className="analyzer-section-title"><span>Antes da análise</span><small>até {questions.length} perguntas</small></div>
    <p className="analyzer-muted">Essas respostas mudam o peso de cada critério. Se não souber, deixe em branco e a informação ficará como não informada.</p>
    {questions.map((question) => <label className="analyzer-question" key={question.id}><span>{question.question}{question.required && <em> obrigatório</em>}</span><small>{question.reason}</small><textarea value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} rows={2} placeholder={question.id === "orcamento" ? "Ex.: R$ 3.500" : "Digite sua resposta"} /></label>)}
    <button className="analyzer-primary-btn" disabled={busy} type="submit">{busy ? "Processando…" : "Continuar análise"}<Icon name="arrow" /></button>
  </form>;
}

function CompatibilityMatrix({ checks }: { checks: CompatibilityCheck[] }) {
  if (checks.length === 0) return null;
  return <section className="analyzer-compatibility"><div className="analyzer-section-title"><span>Matriz de compatibilidade</span><small>não é apenas sim ou não</small></div>{checks.map((check) => <article className="analyzer-compatibility-row" key={`${check.item_a}-${check.item_b}`}><div className="analyzer-compatibility-title"><strong>{check.item_a}</strong><span>×</span><strong>{check.item_b}</strong><StatusPill status={check.resultado} /></div><p><b>Regra:</b> {check.regra_usada}</p><p><b>Dados de apoio:</b> {check.dados_apoio.length ? check.dados_apoio.map((item) => `${item.item}: ${item.valor}`).join(" · ") : "nenhum"}</p><p><b>Dados faltantes:</b> {check.dados_faltantes.length ? check.dados_faltantes.join(", ") : "nenhum"}</p></article>)}</section>;
}

export default function AnalyzerView({ token, onLogin }: Props) {
  const [input, setInput] = useState(""); const [category, setCategory] = useState(""); const [objective, setObjective] = useState(""); const [budget, setBudget] = useState(""); const [existing, setExisting] = useState("");
  const [session, setSession] = useState<AnalyzerSession | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [scenario, setScenario] = useState<Scenario>("custo_beneficio"); const [prices, setPrices] = useState<AnalyzerPrice[]>([]); const [sources, setSources] = useState<ImportedSource[]>([]);
  const suspiciousPriceIds = useMemo(() => { if (prices.length < 3) return new Set<string>(); const sorted = [...prices].sort((a, b) => a.price - b.price); const median = sorted[Math.floor(sorted.length / 2)]?.price ?? 0; return new Set(prices.filter((price) => price.price < median * 0.65 || !price.seller).map((price) => price.id)); }, [prices]);

  useEffect(() => { if (!token) return; void getProfile(token).then((profile) => { const preferences = profile.preferences; if (!preferences) return; setObjective(preferences.objective ?? ""); setBudget(preferences.budgetBrl?.toString() ?? ""); setExisting(preferences.existingEquipment ?? ""); }).catch(() => undefined); }, [token]);

  async function submit() {
    if (!input.trim() || busy) return; setBusy(true); setError("");
    try {
      const names = input.split(/[\n;]+/).map((value) => value.trim()).filter(Boolean).slice(0, 8);
      const imported = await Promise.all(names.map(async (name) => { if (!/^https?:\/\//i.test(name)) return null; try { return await importSource(name, token); } catch { return null; } }));
      const validSources = imported.filter((source): source is ImportedSource => source !== null); setSources(validSources);
      const items = names.map((name, index) => { const source = imported[index]; return { nome: source?.nome || name, origem: source ? "busca" as const : "manual" as const, confirmado: source?.confirmado ?? false }; });
      const parsedBudget = budget ? Number(budget.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) : undefined;
      const extracted = validSources.map((source) => source.textoExtraido).filter(Boolean).join("\n").slice(0, 12_000);
      setSession(await createAnalysis({ input: `${input.trim()}${extracted ? `\n\nTexto extraído das fontes:\n${extracted}` : ""}`, categoria: category || undefined, equipamentos: items, contexto: { objective: objective.trim() || undefined, budgetBrl: parsedBudget, existingEquipment: existing.trim() || undefined, region: "BR" } }, token));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível criar a análise."); } finally { setBusy(false); }
  }

  async function continueAnalysis(answers: Array<{ questionId: string; answer: string }>) { if (!session || busy) return; setBusy(true); setError(""); try { setSession(await answerAnalysis(session.id, answers, token)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o contexto."); } finally { setBusy(false); } }
  async function updatePrices() { if (!session || busy) return; setBusy(true); setError(""); try { const refreshed = await refreshPrices(session.id, token); setPrices(refreshed.precos); if (refreshed.alertasAtingidos.length > 0) setError(`${refreshed.alertasAtingidos.length} alerta(s) atingido(s) nesta atualização.`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar os preços."); } finally { setBusy(false); } }
  async function alertPrice(price: AnalyzerPrice) { if (!token) { onLogin(); return; } const value = window.prompt(`Qual preço alvo para ${price.title}?`, price.price.toFixed(2).replace(".", ",")); if (!value || !session) return; const target = Number(value.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")); if (!Number.isFinite(target) || target <= 0) return; try { await createPriceAlert({ analysisId: session.id, analysisItemId: price.itemId ?? undefined, title: price.title, url: price.url, targetPriceBrl: target }, token); setError("Alerta criado. Ele será verificado nas próximas atualizações de preço."); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível criar o alerta."); } }

  const result = session?.resultado;
  return <div className="analyzer-view">
    <div className="analyzer-intro"><div><span className="analyzer-kicker"><Icon name="sparkles" /> Análise técnica universal</span><h1>Compare qualquer equipamento com contexto.</h1><p>Informe modelos, links ou especificações. O sistema separa fatos, fontes, estimativas e riscos sem inventar dados ausentes.</p></div><div className="analyzer-limit"><strong>Até 8 itens</strong><span>Brasil · BRL · fontes com data</span></div></div>
    {!session && <section className="analyzer-input-card"><div className="analyzer-field full"><label>O que você quer analisar?</label><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={5} placeholder={"Ex.:\nRyzen 7 7700\nCore i5-14400\nhttps://loja.com/produto\n\nVocê também pode colar links de páginas oficiais ou PDFs."} /></div><div className="analyzer-field"><label>Categoria (opcional)</label><SearchableSelect value={category} onChange={setCategory} /></div><div className="analyzer-field"><label>Objetivo (opcional)</label><input value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Jogos, trabalho, edição…" /></div><div className="analyzer-field"><label>Orçamento em BRL (opcional)</label><input value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Ex.: 5000" inputMode="decimal" /></div><div className="analyzer-field"><label>O que você já possui? (opcional)</label><input value={existing} onChange={(event) => setExisting(event.target.value)} placeholder="Ex.: placa-mãe AM5 e fonte 650 W" /></div><button className="analyzer-primary-btn" disabled={!input.trim() || busy} onClick={() => void submit()} type="button">{busy ? "Importando fontes…" : "Analisar equipamentos"}<Icon name="arrow" /></button>{error && <p className="analyzer-error">{error}</p>}</section>}
    {session && !result && session.perguntas.length > 0 && <Questions questions={session.perguntas} busy={busy} onSubmit={(answers) => void continueAnalysis(answers)} />}
    {session && session.status === "processing" && <div className="analyzer-processing"><Icon name="sparkles" /><strong>Interpretando especificações…</strong><span>A validação mantém fatos, fontes, estimativas e faltantes separados.</span></div>}
    {session && result && <section className="analyzer-result"><div className="analyzer-result-head"><div><span className="analyzer-kicker"><Icon name="check" /> Resultado estruturado</span><h2>{result.recomendacao.escolha}</h2><p>{result.recomendacao.motivo}</p></div><div className="analyzer-result-actions"><button className="analyzer-secondary-btn" onClick={() => void updatePrices()} disabled={busy} type="button">{busy ? "Consultando…" : "Atualizar preços"}</button><button className="analyzer-secondary-btn" onClick={() => { setSession(null); setPrices([]); }} type="button">Nova análise</button></div></div><div className="analyzer-callout"><strong>Alternativa</strong><span>{result.recomendacao.alternativa}</span></div>{sources.length > 0 && <section className="analyzer-sources"><div className="analyzer-section-title"><span>Fontes importadas</span><small>recuperadas com data</small></div>{sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}><span>{source.nome}</span><small>{source.tipo} · {new Date(source.recuperadoEm).toLocaleString("pt-BR")}</small></a>)}</section>}{prices.length > 0 && <section className="analyzer-prices"><div className="analyzer-section-title"><span>Ofertas atuais</span><small>observadas com fonte e data</small></div>{prices.slice(0, 16).map((price) => <div className={`analyzer-price-row${suspiciousPriceIds.has(price.id) ? " is-suspicious" : ""}`} key={price.id}><a href={price.url} target="_blank" rel="noreferrer"><span>{price.title}</span><strong>{money(price.price)}</strong><small>{price.seller ?? "Fonte consultada"} · {new Date(price.observedAt).toLocaleString("pt-BR")}</small></a>{suspiciousPriceIds.has(price.id) && <em title="Preço abaixo da mediana ou vendedor não informado">Verificar anúncio</em>}<button type="button" onClick={() => void alertPrice(price)}>Alertar</button></div>)}</section>}<div className="analyzer-scenario-bar"><strong>Ver recomendação por cenário</strong>{(Object.keys(scenarioLabels) as Scenario[]).map((item) => <button key={item} className={scenario === item ? "is-active" : ""} onClick={() => setScenario(item)} type="button">{scenarioLabels[item]}</button>)}</div><div className="analyzer-legend"><span><i className="origin-informed" /> informado</span><span><i className="origin-known" /> conhecido</span><span><i className="origin-estimated" /> estimado</span><span><i className="origin-missing" /> não informado</span></div>{result.equipamentos.map((equipment) => <article className="analyzer-equipment" key={equipment.nome}><div className="analyzer-equipment-head"><div><h3>{equipment.nome}</h3><span className="analyzer-confirmed">{equipment.specs_informadas.confirmado ? "Confirmado" : "Não confirmado"}</span></div><span className="analyzer-category">{result.categoria ? categories.find((item) => item.value === result.categoria)?.label ?? result.categoria : "Categoria indeterminada"}</span></div><div className="analyzer-data-grid"><DataBlock title="Fato informado" value={equipment.specs_informadas} /><DataBlock title="Fato conhecido" value={equipment.specs_conhecidas} /></div>{equipment.estimativas.length > 0 && <div className="analyzer-estimates"><div className="analyzer-section-title"><span>Estimativas</span><small>base e confiança</small></div>{equipment.estimativas.map((estimate) => <div className="analyzer-estimate" key={`${estimate.item}-${estimate.valor}`}><strong>{estimate.item}</strong><span>{estimate.valor}</span><small>{estimate.base} · confiança {estimate.confianca}</small></div>)}</div>}<div className="analyzer-proscons"><div><strong>Pontos positivos</strong>{equipment.pontos_positivos.map((item) => <span key={item}>+ {item}</span>)}</div><div><strong>Pontos negativos</strong>{equipment.pontos_negativos.map((item) => <span key={item}>− {item}</span>)}</div></div><div className="analyzer-scores"><strong>Score: {scenarioLabels[scenario]}</strong>{Object.entries(equipment.scores_por_uso).filter(([key]) => key === scenario).map(([key, score]) => <div key={key}><span>{scenarioLabels[key as Scenario]}</span><b>{score.score === null ? "—" : score.score}</b><small>{score.justificativa}</small></div>)}</div></article>)}<CompatibilityMatrix checks={result.compatibilidade} />{(result.suposicoes.length > 0 || result.dados_faltantes.length > 0 || result.dados_que_precisam_de_consulta_atualizada.length > 0) && <div className="analyzer-notes"><div><strong>Limites e suposições</strong>{result.suposicoes.map((item) => <span key={item}>{item}</span>)}</div><div><strong>Ainda falta</strong>{result.dados_faltantes.map((item) => <span key={item}>{item}</span>)}</div><div><strong>Precisa de consulta atualizada</strong><span>{result.dados_que_precisam_de_consulta_atualizada.join(", ")}</span></div></div>}{session.modelo && <div className="analyzer-model-note">Modelo: {session.modelo}{session.modeloFallback ? ` · fallback: ${session.modeloFallback}` : ""}</div>}</section>}
    {error && session && <p className="analyzer-error">{error}</p>}
    {!token && <p className="analyzer-login-note">Você está no modo anônimo. <button type="button" onClick={onLogin}>Entre na conta</button> para salvar histórico e receber alertas.</p>}
  </div>;
}
