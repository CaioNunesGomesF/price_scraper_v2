import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import Icon from "../../shared/Icon";
import { money } from "../../shared/money";
import type { Offer } from "./search.types";

type Props = {
  offer: Offer;
  onClose: () => void;
  onFavorite: () => void;
  saved: boolean;
  busy: boolean;
  favoriteError: string;
  signedIn: boolean;
};

export default function OfferDrawer({ offer, onClose, onFavorite, saved, busy, favoriteError, signedIn }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const storeName = offer.source === "kabum" ? "KaBuM!" : offer.source === "mercado_livre" ? "Mercado Livre" : offer.source;

  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <>
    <motion.button className="drawer-backdrop" aria-label="Fechar detalhes" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
    <motion.aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.26, ease: [0.2, 0.7, 0.2, 1] }}>
      <div className="drawer-top"><span>Detalhes da oferta</span><button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar painel"><Icon name="close" /></button></div>
      <div className="drawer-photo">{offer.thumbnail ? <img src={offer.thumbnail} alt={offer.title} /> : <span>Imagem indisponível</span>}</div>
      <p className="drawer-source">{storeName}</p>
      <h2 id="drawer-title">{offer.title}</h2>
      <div className="drawer-price">{money(offer.price)}</div>
      {offer.originalPrice && offer.originalPrice > offer.price && <p className="drawer-old-price">Preço anterior: {money(offer.originalPrice)}</p>}
      <dl className="drawer-details">
        <div><dt>Loja</dt><dd>{storeName}</dd></div>
        <div><dt>Frete</dt><dd>{offer.freeShipping ? "Grátis" : `Confira na ${storeName}`}</dd></div>
        <div><dt>Vendedor</dt><dd>{offer.seller || "Não informado"}</dd></div>
        <div><dt>Localização</dt><dd>{offer.location || "Não informada"}</dd></div>
        <div><dt>Consultado em</dt><dd>{new Date(offer.updatedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</dd></div>
      </dl>
      <button className="drawer-favorite" type="button" onClick={onFavorite} disabled={busy}><Icon name="heart" /> {saved ? "Remover dos favoritos" : signedIn ? "Salvar nos favoritos" : "Entre para favoritar"}</button>
      {favoriteError && <p className="inline-error" role="alert">{favoriteError}</p>}
      <a className="drawer-link" href={offer.permalink} target="_blank" rel="noopener noreferrer">Abrir oferta na {storeName} <Icon name="external" /></a>
      <p className="drawer-footnote">Preço e disponibilidade podem mudar na loja.</p>
    </motion.aside>
  </>;
}
