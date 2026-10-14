import { useEffect, useState } from "react";
import Icon from "../../shared/Icon";
import { money } from "../../shared/money";
import StoreLogo from "./StoreLogo";
import { getCatalog, type CatalogProduct, type PartnerStore, type SearchSource } from "./stores.api";

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
  try {
    return new URL(websiteUrl).hostname;
  } catch {
    return undefined;
  }
}

export default function StoresView({ sources, stores, loading, error, onAddStore, onRetry }: Props) {
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  useEffect(() => {
    getCatalog()
      .then((data) => setCatalog(data))
      .catch(() => {});
  }, [stores]);

  const totalProducts = stores.reduce((sum, s) => sum + (s.productCount || 0), 0);

  return (
    <section className="view stores-view">
      <div className="view-heading">
        <div className="dashboard-header-flex">
          <div>
            <p>Onde comparamos preços</p>
            <h1>Lojas e Fontes Conectadas</h1>
            <span>Canais consultados pelo scraper e lojas parceiras cadastradas no PostgreSQL.</span>
          </div>
          <button type="button" className="btn-profile-primary" style={{ flex: "none" }} onClick={onAddStore}>
            <Icon name="plus" />
            <span>Cadastrar Minha Loja</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="store-load-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Metrics of stores */}
      <div className="metric-strip" style={{ marginBottom: 32 }}>
        <div>
          <span>Fontes de Busca</span>
          <strong>{sources.length} canais</strong>
          <small className="metric-hint">marketplaces e agregadores</small>
        </div>
        <div>
          <span>Lojas Parceiras</span>
          <strong className="text-highlight-green">{stores.length} ativas</strong>
          <small className="metric-hint">com dados no PostgreSQL</small>
        </div>
        <div>
          <span>Ofertas Cadastradas</span>
          <strong>{totalProducts} produtos</strong>
          <small className="metric-hint">monitorados nas lojas</small>
        </div>
      </div>

      {/* Section 1: Search Sources */}
      <section className="store-section" aria-labelledby="sources-title">
        <div className="store-section-heading">
          <div>
            <h2 id="sources-title">Fontes de Busca Automáticas</h2>
            <p>O robô consulta estes canais em tempo real conforme o termo pesquisado.</p>
          </div>
        </div>
        {loading ? (
          <p className="view-status">Carregando fontes…</p>
        ) : (
          <div className="store-source-list">
            {sources.map((source) => (
              <article className="store-source-row" key={source.id}>
                <StoreLogo name={source.name} domain={source.domain} className={sourceClass[source.kind]} />
                <span className="store-source-copy">
                  <strong>{source.name}</strong>
                  <small>{source.description}</small>
                </span>
                <span className="store-source-kind">
                  {source.kind === "aggregator" ? "Agregador" : source.kind === "retailer" ? "Loja" : "Marketplace"}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Partner Stores */}
      <section className="store-section" aria-labelledby="partners-title">
        <div className="store-section-heading">
          <div>
            <h2 id="partners-title">Lojas Parceiras no Banco de Dados</h2>
            <p>Produtos cadastrados pelas lojas e integrados diretamente na comparação de preços.</p>
          </div>
        </div>

        {loading ? (
          <div className="account-checking-card">
            <div className="auth-spinner" />
            <p>Carregando lojas parceiras...</p>
          </div>
        ) : stores.length === 0 ? (
          <div className="store-empty">
            <p>Nenhuma loja parceira cadastrada ainda.</p>
            <span>Cadastre sua loja para que seus produtos apareçam no Achado!</span>
            <button type="button" className="auth-submit-btn" style={{ maxWidth: 220, marginTop: 14 }} onClick={onAddStore}>
              Cadastrar Loja Agora
            </button>
          </div>
        ) : (
          <div className="partner-store-list">
            {stores.map((store) => {
              const storeProducts = catalog.filter((p) => p.storeId === store.id || p.storeName === store.name);
              const isExpanded = selectedStoreId === store.id;

              return (
                <div key={store.id} className="partner-store-card-wrap">
                  <article className={`partner-store-row${store.name === "Cometa Serv" ? " store-row-cometa" : ""}`}>
                    <StoreLogo name={store.name} domain={websiteDomain(store.websiteUrl)} imageUrl={store.name === "Cometa Serv" ? "/cometa-serv-logo.png" : undefined} className={`store-source-partner${store.name === "Cometa Serv" ? " store-mark-cometa" : ""}`} />
                    <span className="store-source-copy">
                      <div className="store-title-badge-row">
                        <strong>{store.name}</strong>
                        <span className="store-status-active-pill">
                          <Icon name="check" /> Ativa
                        </span>
                      </div>
                      <small>
                        {store.description ||
                          [store.city, store.state].filter(Boolean).join(" · ") ||
                          websiteDomain(store.websiteUrl)}
                      </small>
                    </span>

                    <button
                      type="button"
                      className="partner-product-count-btn"
                      onClick={() => setSelectedStoreId(isExpanded ? null : store.id)}
                      title="Ver produtos desta loja"
                    >
                      <span>{store.productCount} {store.productCount === 1 ? "oferta" : "ofertas"}</span>
                      <Icon name="arrow" />
                    </button>

                    <a className="partner-store-link" href={store.websiteUrl} target="_blank" rel="noreferrer">
                      Visitar Site
                    </a>
                  </article>

                  {/* Expandable products preview */}
                  {isExpanded && (
                    <div className="partner-store-products-tray">
                      <h4>Produtos cadastrados em {store.name}:</h4>
                      {storeProducts.length === 0 ? (
                        <p className="no-products-hint">Nenhum produto listado no momento.</p>
                      ) : (
                        <div className="store-products-mini-grid">
                          {storeProducts.map((prod) => (
                            <div className="store-product-mini-item" key={prod.id}>
                              <div className="store-prod-title">{prod.title}</div>
                              <div className="store-prod-meta">
                                <b className="text-highlight-green">{money(prod.price)}</b>
                                <a href={prod.productUrl} target="_blank" rel="noreferrer" className="link-inline">
                                  Ver na loja
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
