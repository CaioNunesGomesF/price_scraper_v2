import { motion } from "framer-motion";
import Icon from "../../shared/Icon";
import { money } from "../../shared/money";
import type { ComparisonAnalysis, Offer } from "./search.types";
import "./comparison-loading.css";

type Props = {
  offers: Offer[];
  analysis: ComparisonAnalysis | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onRemove: (offerId: string) => void;
  onAnalyze: () => void;
};

export default function ComparisonDrawer({ offers, analysis, loading, error, onClose, onRemove, onAnalyze }: Props) {
  const prices = offers.map((offer) => offer.price);
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const savings = highest - lowest;

  return <>
    <motion.button className="drawer-backdrop comparison-backdrop" aria-label="Fechar comparação" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
    <motion.aside className="comparison-drawer" role="dialog" aria-modal="true" aria-labelledby="comparison-title" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.26, ease: [0.2, 0.7, 0.2, 1] }}>
      <div className="comparison-top"><div><span className="comparison-eyebrow">Decisão de compra</span><h2 id="comparison-title">Comparar ofertas</h2></div><button type="button" onClick={onClose} aria-label="Fechar comparação"><Icon name="close" /></button></div>
      <p className="comparison-intro">Os valores abaixo vêm das ofertas selecionadas. A IA ajuda a interpretar a diferença entre elas.</p>

      <div className="comparison-metrics" aria-label="Resumo dos preços">
        <div><span>Menor preço</span><strong>{money(lowest)}</strong></div>
        <div><span>Preço médio</span><strong>{money(average)}</strong></div>
        <div><span>Diferença máxima</span><strong>{money(savings)}</strong></div>
      </div>

      <section className="comparison-products" aria-labelledby="comparison-products-title">
        <div className="comparison-section-heading"><h3 id="comparison-products-title">{offers.length} produtos selecionados</h3><span>Até 8 ofertas</span></div>
        {offers.map((offer) => {
          const isBest = analysis?.bestOfferId === offer.id;
          return <article className={`comparison-product${isBest ? " is-best" : ""}`} key={offer.id}>
            <div className="comparison-product-photo">{offer.thumbnail ? <img src={offer.thumbnail} alt="" /> : <span>{offer.source.slice(0, 2).toUpperCase()}</span>}</div>
            <div className="comparison-product-copy"><strong title={offer.title}>{offer.title}</strong><span>{offer.source}{offer.seller ? ` · ${offer.seller}` : ""}</span></div>
            <div className="comparison-product-price"><strong>{money(offer.price)}</strong>{offer.freeShipping && <span>Frete grátis</span>}{isBest && <em>Recomendado</em>}</div>
            <button type="button" className="comparison-remove" onClick={() => onRemove(offer.id)} aria-label={`Remover ${offer.title}`}><Icon name="close" /></button>
          </article>;
        })}
      </section>

      <section className="comparison-ai" aria-labelledby="comparison-ai-title">
        <div className="comparison-section-heading"><h3 id="comparison-ai-title"><Icon name="sparkles" /> Leitura do Achado</h3><span className={loading ? "is-loading" : ""}>{loading ? "Comparação em andamento" : "Baseada nos dados selecionados"}</span></div>
        {analysis ? <div className="comparison-analysis">
          {loading && <div className="comparison-refreshing"><span className="comparison-refresh-dot" /><div><strong>Comparação em andamento</strong><span>Analisando preço, loja, frete e condições das ofertas selecionadas…</span></div></div>}
          {error && <div className="comparison-error" role="alert"><p>{error}</p><button type="button" onClick={onAnalyze}>Tentar novamente</button></div>}
          <p className="comparison-summary">{analysis.summary}</p>
          <div className="comparison-analysis-block"><span>Recomendação</span><p>{analysis.recommendation}</p></div>
          <div className="comparison-analysis-block"><span>Sobre o preço</span><p>{analysis.priceInsight}</p></div>
          {analysis.highlights.length > 0 && <div className="comparison-highlights">{analysis.highlights.map((highlight) => <span key={`${highlight.offerId}-${highlight.label}`}><b>{highlight.label}</b>{highlight.text}</span>)}</div>}
        </div> : loading ? <div className="comparison-loading"><div className="loading-line" /><strong>Comparação em andamento</strong><p>Estamos cruzando preço, loja, frete e condições. A recomendação aparecerá aqui em seguida.</p></div> : <div className="comparison-empty"><p>Peça uma leitura dos preços e das condições para decidir com mais segurança.</p><button type="button" onClick={onAnalyze}><Icon name="sparkles" /> Analisar com IA</button></div>}
      </section>

      <p className="comparison-footnote">A recomendação é uma orientação. Confirme disponibilidade, frete e garantia na loja antes de comprar.</p>
    </motion.aside>
  </>;
}
