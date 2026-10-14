import { useEffect, useState, type RefObject } from "react";
import Icon from "../../shared/Icon";
import { money } from "../../shared/money";
import type { ChatTurn, Offer, SearchResult } from "./search.types";
import "./loading.css";

const suggestions = [
  { label: "Celular para jogos", detail: "Até R$ 2.000", prompt: "Quero um celular para jogos até R$ 2.000" },
  { label: "Notebook para estudar", detail: "Leve e com boa bateria", prompt: "Quero um notebook leve para estudar, com boa bateria" },
  { label: "Fone sem fio", detail: "Com cancelamento de ruído", prompt: "Quero um fone sem fio com cancelamento de ruído" },
];

type Props = {
  turns: ChatTurn[];
  onSuggestion: (prompt: string) => void;
  onRetry: (turnId: string, prompt: string) => void;
  onSelectOffer: (offer: Offer) => void;
  selectedOffers: Offer[];
  onToggleCompare: (offer: Offer) => void;
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

function AssistantResult({ result, selectedOffers, onSelectOffer, onToggleCompare }: { result: SearchResult; selectedOffers: Offer[]; onSelectOffer: (offer: Offer) => void; onToggleCompare: (offer: Offer) => void }) {
  return <div className="assistant-message"><span className="assistant-mark"><Icon name="sparkles" /></span><div className="assistant-content">
    <div className="assistant-header-row"><strong className="assistant-heading">{result.offers.length ? `${result.offers.length} ${result.offers.length === 1 ? "oferta encontrada" : "ofertas encontradas"}` : "Nenhuma oferta encontrada"}</strong>
      {result.interpretation.priorities && result.interpretation.priorities.length > 0 && <div className="ai-priorities-row">{result.interpretation.priorities.flatMap((p) => p.split(",")).map((p) => p.trim()).filter(Boolean).map((item, idx) => <span key={idx} className="ai-priority-chip">{item}</span>)}</div>}
    </div>
    <p className="assistant-lead-text">{result.interpretation.summary || (result.offers.length ? "Dê uma olhada nas opções que encontrei para você comparar:" : "Tente descrever o produto de outra forma para encontrarmos mais opções.")}</p>
    {result.interpretation.tip && <div className="ai-tip-card"><span className="ai-tip-icon"><Icon name="lightbulb" /></span><div className="ai-tip-content"><strong>Dica do Achado:</strong><span>{result.interpretation.tip}</span></div></div>}
    {result.offers.length > 0 && <div className="offers">
      <div className="offers-header"><h2>Melhores ofertas encontradas</h2><span>Escolha duas ou mais para comparar</span></div>
      {result.offers.map((offer) => {
        const badge = getStoreBadge(offer.source);
        const isSelected = selectedOffers.some((selected) => selected.id === offer.id);
        return <article className={`offer${isSelected ? " is-compare-selected" : ""}`} key={offer.id}>
          <button className="offer-main" type="button" onClick={() => onSelectOffer(offer)}>
            <span className="offer-photo">{offer.thumbnail ? <img src={offer.thumbnail} alt="" /> : <span>{badge.letter}</span>}</span>
            <span className="offer-info"><strong>{offer.title}</strong><small><span style={{ fontWeight: 600, color: badge.color }}>{badge.name}</span>{offer.seller && offer.seller !== badge.name ? ` · ${offer.seller}` : ""}{offer.location ? ` · ${offer.location}` : ""}</small></span>
            <span className="offer-price"><strong>{money(offer.price)}</strong><small>{offer.freeShipping ? "Frete grátis" : "Consulte o frete"}</small></span>
            <span className="offer-arrow"><Icon name="arrow" /></span>
          </button>
          <button className="offer-compare" type="button" aria-pressed={isSelected} onClick={() => onToggleCompare(offer)}><span aria-hidden="true">{isSelected ? "✓" : "+"}</span>{isSelected ? "Selecionado" : "Comparar"}</button>
        </article>;
      })}
    </div>}
  </div></div>;
}

export default function ChatView({ turns, onSuggestion, onRetry, onSelectOffer, selectedOffers, onToggleCompare, inputRef }: Props) {
  const latestTurnId = turns[turns.length - 1]?.id ?? null;
  const [expandedTurnId, setExpandedTurnId] = useState<string | null>(latestTurnId);

  useEffect(() => {
    setExpandedTurnId(latestTurnId);
  }, [latestTurnId]);

  if (turns.length === 0) return <section className="welcome" aria-labelledby="welcome-hero-title">
    <div className="welcome-kicker"><span aria-hidden="true" />Pesquisa de compras com contexto</div>
    <div className="welcome-hero-copy">
      <h2 id="welcome-hero-title">Encontre o que vale a pena comprar.</h2>
      <p>Conte o produto, seu orçamento e o que importa na escolha. O Achado cruza ofertas para você comparar com mais clareza.</p>
    </div>
    <div className="welcome-route" aria-label="Como o Achado ajuda">
      <article><span className="welcome-route-number">01</span><div><strong>Você descreve</strong><span>Uso, limite e prioridades.</span></div></article>
      <article><span className="welcome-route-number">02</span><div><strong>O Achado organiza</strong><span>Preço, frete e vendedor.</span></div></article>
      <article><span className="welcome-route-number">03</span><div><strong>Você decide</strong><span>Compara e abre na loja.</span></div></article>
    </div>
    <div className="welcome-section-heading"><span>Comece por um exemplo</span><small>ou escreva do seu jeito</small></div>
    <div className="welcome-suggestions" aria-label="Exemplos de busca">
      {suggestions.map((item) => <button key={item.label} type="button" onClick={() => { onSuggestion(item.prompt); inputRef.current?.focus(); }}><strong>{item.label}</strong><span>{item.detail}</span></button>)}
    </div>
    <p className="welcome-note"><span aria-hidden="true">↳</span> Quanto mais contexto você der, melhor fica a comparação.</p>
  </section>;

  return <section className="conversation" aria-live="polite">
    {turns.map((turn, index) => {
      const expanded = expandedTurnId === turn.id;
      const status = turn.loading
        ? "Consultando…"
        : turn.error
          ? "Não concluída"
          : turn.result
            ? `${turn.result.offers.length} ${turn.result.offers.length === 1 ? "oferta" : "ofertas"}`
            : "Abrir conversa";

      return <article className={`chat-turn${index > 0 ? " is-follow-up" : ""}${expanded ? "" : " is-collapsed"}`} key={turn.id}>
        {!expanded ? <button
          className="chat-turn-summary"
          type="button"
          onClick={() => setExpandedTurnId(turn.id)}
          aria-label={`Reabrir consulta: ${turn.prompt}`}
        >
          <span className="chat-turn-summary-mark">↳</span>
          <span className="chat-turn-summary-copy"><strong>{turn.prompt}</strong><small>Consulta anterior · {status}</small></span>
          <span className="chat-turn-summary-open">Abrir</span>
        </button> : <>
          <div className="user-row"><div className="user-message">{turn.prompt}</div></div>
          {turn.loading && <div className="assistant-message" role="status" aria-live="polite"><span className="assistant-mark loading-mark">a</span><div><strong>Consultando ofertas</strong><p>Analisando seu pedido e buscando nas lojas disponíveis.</p><div className="loading-line" aria-hidden="true"><span /></div></div></div>}
          {turn.error && <div className="assistant-message error-message"><span className="assistant-mark">a</span><div><strong>A busca não foi concluída</strong><p>{turn.error}</p><button type="button" onClick={() => { setExpandedTurnId(turn.id); onRetry(turn.id, turn.prompt); }}>Tentar novamente</button></div></div>}
          {turn.result && <AssistantResult result={turn.result} selectedOffers={selectedOffers} onSelectOffer={onSelectOffer} onToggleCompare={onToggleCompare} />}
        </>}
      </article>;
    })}
  </section>;
}
