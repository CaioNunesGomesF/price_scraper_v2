import { useEffect, useState } from "react";
import Icon from "../../shared/Icon";
import { money } from "../../shared/money";
import type { Offer } from "../search/search.types";
import { getCatalog, type CatalogProduct } from "../stores/stores.api";
import type { Favorite } from "./favorites.api";

type Props = {
  checking: boolean;
  loading: boolean;
  signedIn: boolean;
  favorites: Favorite[];
  busy: boolean;
  error: string;
  onAccount: () => void;
  onSearch: () => void;
  onSelectOffer: (offer: Offer) => void;
  onRemove: (offer: Offer) => void;
  onAddFavorite?: (offer: Offer) => void;
};

export default function FavoritesView({
  checking,
  loading,
  signedIn,
  favorites,
  busy,
  error,
  onAccount,
  onSearch,
  onSelectOffer,
  onRemove,
  onAddFavorite,
}: Props) {
  const [catalogSample, setCatalogSample] = useState<CatalogProduct[]>([]);

  useEffect(() => {
    if (signedIn && favorites.length === 0) {
      getCatalog()
        .then((data) => setCatalogSample(data.slice(0, 4)))
        .catch(() => {});
    }
  }, [signedIn, favorites.length]);

  const prices = favorites.map((f) => f.offer.price).filter((p) => Number.isFinite(p));
  const totalVal = prices.reduce((sum, p) => sum + p, 0);
  const minVal = prices.length ? Math.min(...prices) : 0;
  const avgVal = prices.length ? totalVal / prices.length : 0;

  return (
    <section className="view favorites-view">
      <div className="view-heading">
        <p>Produtos salvos no PostgreSQL</p>
        <h1>Meus Favoritos</h1>
        <span>
          Ofertas guardadas na sua conta com persistência em banco de dados. Os preços refletem o momento em que você
          salvou.
        </span>
      </div>

      {checking || loading ? (
        <div className="account-checking-card">
          <div className="auth-spinner" />
          <p>Carregando seus favoritos do banco...</p>
        </div>
      ) : !signedIn ? (
        <div className="auth-card" style={{ maxWidth: 540, margin: "36px auto", textAlign: "center" }}>
          <div className="benefit-icon" style={{ margin: "0 auto 16px", width: 44, height: 44 }}>
            <Icon name="heart" />
          </div>
          <h2>Conecte sua conta para salvar ofertas</h2>
          <p style={{ color: "#6c7d70", margin: "10px 0 24px", lineHeight: 1.5 }}>
            Os favoritos são vinculados ao seu e-mail no banco de dados PostgreSQL. Crie uma conta ou entre para
            manter seu histórico de produtos salvo.
          </p>
          <button type="button" className="auth-submit-btn" onClick={onAccount}>
            <Icon name="user" />
            <span>Fazer Login ou Criar Conta</span>
          </button>
        </div>
      ) : favorites.length === 0 ? (
        <div className="favorites-empty-container">
          <div className="empty-view">
            <h2>Você ainda não tem favoritos salvos.</h2>
            <p>Faça uma busca ou aproveite as sugestões abaixo do nosso catálogo para testar.</p>
            <button type="button" onClick={onSearch}>
              Ir para a Busca
            </button>
          </div>

          {catalogSample.length > 0 && onAddFavorite && (
            <div className="catalog-suggestions-section">
              <div className="catalog-suggestions-title">
                <Icon name="plus" />
                <h3>Sugestões do Catálogo Real para Favoritar</h3>
              </div>
              <div className="catalog-suggestions-grid">
                {catalogSample.map((prod) => {
                  const offerObj: Offer = {
                    id: `partner_${prod.id}`,
                    source: prod.storeName,
                    title: prod.title,
                    price: prod.price,
                    originalPrice: null,
                    currency: "BRL",
                    freeShipping: false,
                    seller: prod.storeName,
                    location: null,
                    permalink: prod.productUrl,
                    thumbnail: prod.imageUrl,
                    updatedAt: prod.createdAt,
                  };
                  return (
                    <article className="catalog-suggestion-card" key={prod.id}>
                      <div className="suggestion-photo">
                        {prod.imageUrl ? <img src={prod.imageUrl} alt="" /> : <span>{prod.storeName.slice(0, 2)}</span>}
                      </div>
                      <div className="suggestion-info">
                        <span className="suggestion-store">{prod.storeName}</span>
                        <strong>{prod.title}</strong>
                        <b>{money(prod.price)}</b>
                      </div>
                      <button
                        type="button"
                        className="btn-add-favorite"
                        disabled={busy}
                        onClick={() => onAddFavorite(offerObj)}
                        title="Salvar nos Favoritos"
                      >
                        <Icon name="heart" /> Salvar
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Summary metrics for favorites */}
          <div className="metric-strip" style={{ marginBottom: 28 }}>
            <div>
              <span>Total de Favoritos</span>
              <strong>{favorites.length}</strong>
            </div>
            <div>
              <span>Menor Preço Salvo</span>
              <strong className="text-highlight-green">{money(minVal)}</strong>
            </div>
            <div>
              <span>Preço Médio Salvo</span>
              <strong>{money(avgVal)}</strong>
            </div>
            <div>
              <span>Valor Total da Lista</span>
              <strong>{money(totalVal)}</strong>
            </div>
          </div>

          <div className="favorite-list">
            {favorites.map((item) => (
              <article className="favorite-row" key={item.id}>
                <button type="button" className="favorite-open" onClick={() => onSelectOffer(item.offer)}>
                  <span className="offer-photo">
                    {item.offer.thumbnail ? <img src={item.offer.thumbnail} alt="" /> : <span>ML</span>}
                  </span>
                  <span>
                    <strong>{item.offer.title}</strong>
                    <small>
                      {item.offer.seller || item.offer.source || "Mercado Livre"}
                    </small>
                  </span>
                  <b>{money(item.offer.price)}</b>
                </button>
                <div className="favorite-actions-end">
                  {item.offer.permalink && (
                    <a
                      href={item.offer.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="favorite-visit-btn"
                      title="Visitar na loja"
                    >
                      <Icon name="external" />
                    </a>
                  )}
                  <button
                    type="button"
                    className="favorite-remove"
                    disabled={busy}
                    onClick={() => onRemove(item.offer)}
                    title="Remover dos favoritos"
                  >
                    Remover
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {error && (
        <div className="auth-alert error" style={{ marginTop: 24 }} role="alert">
          <Icon name="close" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}
