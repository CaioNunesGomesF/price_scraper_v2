import type { PartnerStore, SearchSource } from "./stores.api";
import StoreLogo from "./StoreLogo";

type Props = {
  sources: SearchSource[];
  stores: PartnerStore[];
  loading: boolean;
  error: string;
  onAddStore: () => void;
  onRetry: () => void;
};

const sourceClass: Record<SearchSource["kind"], string> = {
  marketplace: "store-source-marketplace",
  retailer: "store-source-retailer",
  aggregator: "store-source-aggregator",
};

function websiteDomain(websiteUrl: string) {
  try { return new URL(websiteUrl).hostname; }
  catch { return undefined; }
}

export default function StoresView({ sources, stores, loading, error, onAddStore, onRetry }: Props) {
  return <section className="view stores-view">
    <div className="view-heading"><p>Onde comparamos</p><h1>Lojas e fontes</h1><span>Veja os canais consultados na busca e as lojas parceiras aprovadas.</span></div>
    {error && <div className="store-load-error" role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Tentar novamente</button></div>}
    <section className="store-section" aria-labelledby="sources-title">
      <div className="store-section-heading"><div><h2 id="sources-title">Fontes de busca</h2><p>Os resultados variam conforme o produto pesquisado.</p></div></div>
      {loading ? <p className="view-status">Carregando fontes…</p> : <div className="store-source-list">{sources.map((source) => <article className="store-source-row" key={source.id}>
        <StoreLogo name={source.name} domain={source.domain} className={sourceClass[source.kind]} />
        <span className="store-source-copy"><strong>{source.name}</strong><small>{source.description}</small></span>
        <span className="store-source-kind">{source.kind === "aggregator" ? "Agregador" : source.kind === "retailer" ? "Loja" : "Marketplace"}</span>
      </article>)}</div>}
    </section>
    <section className="store-section" aria-labelledby="partners-title">
      <div className="store-section-heading"><div><h2 id="partners-title">Lojas parceiras</h2><p>Ofertas enviadas pelas próprias lojas, identificadas na comparação.</p></div><button type="button" onClick={onAddStore}>Cadastrar minha loja</button></div>
      {loading ? <p className="view-status">Carregando lojas…</p> : stores.length === 0 ? <div className="store-empty"><p>Ainda não há lojas parceiras aprovadas.</p><span>Você pode enviar uma loja e seus produtos para análise.</span></div> : <div className="partner-store-list">{stores.map((store) => <article className="partner-store-row" key={store.id}>
        <StoreLogo name={store.name} domain={websiteDomain(store.websiteUrl)} className="store-source-partner" />
        <span className="store-source-copy"><strong>{store.name}</strong><small>{store.description || [store.city, store.state].filter(Boolean).join(" · ") || websiteDomain(store.websiteUrl)}</small></span>
        <span className="partner-product-count">{store.productCount} {store.productCount === 1 ? "oferta" : "ofertas"}</span>
        <a className="partner-store-link" href={store.websiteUrl} target="_blank" rel="noreferrer">Visitar</a>
      </article>)}</div>}
    </section>
  </section>;
}
