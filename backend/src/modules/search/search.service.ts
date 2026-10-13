import * as llmService from "../llm/llm.service.js";
import * as partnerStoresService from "../partner-stores/partner-stores.service.js";
import * as searchRepository from "./search.repository.js";
import { SearchRequestDTO } from "./search.zod.js";

export async function searchOffers(data: SearchRequestDTO) {
  // A interpretacao e as fontes independentes comecam juntas; a consulta nao espera a LLM.
  const interpretationPromise = llmService.interpretSearch({ prompt: data.prompt });
  const sourcesPromise = Promise.allSettled([
    searchRepository.searchMercadoLivre(data.prompt),
    searchRepository.searchKabum(data.prompt),
    searchRepository.searchGoogleShopping(data.prompt),
    partnerStoresService.searchPartnerProducts(data.prompt),
  ]);
  const [interpretation, [meliResult, kabumResult, googleResult, partnerResult]] =
    await Promise.all([interpretationPromise, sourcesPromise]);

  const meliOffers = meliResult.status === "fulfilled" ? meliResult.value : [];
  const kabumOffers = kabumResult.status === "fulfilled" ? kabumResult.value : [];
  const googleOffers = googleResult.status === "fulfilled" ? googleResult.value : [];
  const partnerOffers = partnerResult.status === "fulfilled" ? partnerResult.value : [];

  const allOffers = [...meliOffers, ...kabumOffers, ...googleOffers, ...partnerOffers];

  const filteredOffers = interpretation.maxPrice
    ? allOffers.filter((offer) => offer.price <= interpretation.maxPrice!)
    : allOffers;

  // Ordena por menor preço para destacar a melhor oferta
  filteredOffers.sort((a, b) => a.price - b.price);

  return { interpretation, offers: filteredOffers };
}
