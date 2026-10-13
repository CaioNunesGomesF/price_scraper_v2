import { money } from "../../shared/money";
import type { Offer } from "../search/search.types";
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
};

export default function FavoritesView({ checking, loading, signedIn, favorites, busy, error, onAccount, onSearch, onSelectOffer, onRemove }: Props) {
  return <section className="view favorites-view">
    <div className="view-heading"><p>Produtos salvos</p><h1>Favoritos</h1><span>Ofertas guardadas na sua conta para consultar depois. O preço exibido é o do momento em que você salvou.</span></div>
    {checking || loading ? <p className="view-status">Carregando favoritos…</p> : !signedIn ?
      <div className="empty-view"><h2>Entre para salvar ofertas.</h2><p>Crie uma conta ou faça login para guardar os produtos que quiser acompanhar.</p><button type="button" onClick={onAccount}>Entrar ou criar conta</button></div> : favorites.length === 0 ?
      <div className="empty-view"><h2>Você ainda não salvou ofertas.</h2><p>Faça uma busca, abra uma oferta e use “Salvar nos favoritos”.</p><button type="button" onClick={onSearch}>Ir para a busca</button></div> :
      <div className="favorite-list">{favorites.map((item) => <article className="favorite-row" key={item.id}>
        <button type="button" className="favorite-open" onClick={() => onSelectOffer(item.offer)}><span className="offer-photo">{item.offer.thumbnail ? <img src={item.offer.thumbnail} alt="" /> : <span>ML</span>}</span><span><strong>{item.offer.title}</strong><small>{item.offer.seller || "Mercado Livre"}</small></span><b>{money(item.offer.price)}</b></button>
        <button type="button" className="favorite-remove" disabled={busy} onClick={() => onRemove(item.offer)}>Remover</button>
      </article>)}</div>}
    {error && <p className="inline-error" role="alert">{error}</p>}
  </section>;
}
