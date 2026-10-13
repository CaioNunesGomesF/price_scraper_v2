import type { RefObject } from "react";
import Icon from "../../shared/Icon";
import { money } from "../../shared/money";
import type { Offer, SearchResult } from "./search.types";
import "./loading.css";

const suggestions = [
  { label: "Celular para jogos", detail: "Até R$ 2.000", prompt: "Quero um celular para jogos até R$ 2.000" },
  { label: "Notebook para estudar", detail: "Leve e com boa bateria", prompt: "Quero um notebook leve para estudar, com boa bateria" },
  { label: "Fone sem fio", detail: "Com cancelamento de ruído", prompt: "Quero um fone sem fio com cancelamento de ruído" },
];

type Props = {
  submittedQuery: string;
  result: SearchResult | null;
  loading: boolean;
  error: string;
  onSuggestion: (prompt: string) => void;
  onRetry: () => void;
  onSelectOffer: (offer: Offer) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
};

function getStoreBadge(source: string) {
  const lower = source.toLowerCase();
  if (lower.includes("kabum")) return { name: "KaBuM!", color: "#e65100", letter: "KB" };
  if (lower.includes("mercado")) return { name: "Mercado Livre", color: "#2563eb", letter: "ML" };
  if (lower.includes("amazon")) return { name: "Amazon", color: "#d97706", letter: "AZ" };
  if (lower.includes("magalu") || lower.includes("magazine")) return { name: "Magalu", color: "#0284c7", letter: "MG" };
  if (lower.includes("casas bahia")) return { name: "Casas Bahia", color: "#dc2626", letter: "CB" };
  return { name: source, color: "#4f46e5", letter: source.slice(0, 2).toUpperCase() };
}

export default function ChatView({ submittedQuery, result, loading, error, onSuggestion, onRetry, onSelectOffer, inputRef }: Props) {
  if (!submittedQuery) return <section className="welcome" aria-labelledby="welcome-title">
    <h1 id="welcome-title">O que você está procurando?</h1>
    <p>Descreva o que precisa e seu orçamento. O Achado organiza ofertas para você comparar.</p>
    <div className="welcome-suggestions" aria-label="Exemplos de busca">
      {suggestions.map((item) => <button key={item.label} type="button" onClick={() => { onSuggestion(item.prompt); inputRef.current?.focus(); }}><strong>{item.label}</strong><span>{item.detail}</span></button>)}
    </div>
  </section>;

  return <section className="conversation" aria-live="polite">
    <div className="user-row"><div className="user-message">{submittedQuery}</div></div>
    {loading && <div className="assistant-message" role="status" aria-live="polite"><span className="assistant-mark loading-mark">a</span><div><strong>Consultando ofertas</strong><p>Analisando seu pedido e buscando nas lojas disponíveis.</p><div className="loading-line" aria-hidden="true"><span /></div></div></div>}
    {error && <div className="assistant-message error-message"><span className="assistant-mark">a</span><div><strong>A busca não foi concluída</strong><p>{error}</p><button type="button" onClick={onRetry}>Tentar novamente</button></div></div>}
    {result && <div className="assistant-message"><span className="assistant-mark">a</span><div className="assistant-content">
      <strong>{result.offers.length ? `${result.offers.length} opções para comparar` : "Nenhuma oferta encontrada"}</strong>
      <p>{result.interpretation.summary || (result.offers.length ? "Veja as ofertas encontradas abaixo." : "Tente descrever o produto de outra forma.")}</p>
      {result.offers.length > 0 && <div className="offers">
        <div className="offers-header"><h2>Ofertas encontradas</h2><span>Selecione uma para ver os detalhes</span></div>
        {result.offers.map((offer) => {
          const badge = getStoreBadge(offer.source);
          return <button className="offer" type="button" key={offer.id} onClick={() => onSelectOffer(offer)}>
            <span className="offer-photo">{offer.thumbnail ? <img src={offer.thumbnail} alt="" /> : <span>{badge.letter}</span>}</span>
            <span className="offer-info">
              <strong>{offer.title}</strong>
              <small>
                <span style={{ fontWeight: 600, color: badge.color }}>
                  {badge.name}
                </span>
                {offer.seller && offer.seller !== badge.name ? ` • ${offer.seller}` : ""}
                {offer.location ? ` • ${offer.location}` : ""}
              </small>
            </span>
            <span className="offer-price"><strong>{money(offer.price)}</strong><small>{offer.freeShipping ? "Frete grátis" : "Consulte o frete"}</small></span>
            <span className="offer-arrow"><Icon name="arrow" /></span>
          </button>;
        })}
      </div>}
    </div></div>}
  </section>;
}
