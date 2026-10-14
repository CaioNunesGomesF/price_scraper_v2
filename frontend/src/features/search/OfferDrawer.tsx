import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
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

type OfferFact = { label: string; value: string };

function extractOfferFacts(title: string): OfferFact[] {
  const facts: OfferFact[] = [];
  const add = (label: string, value: string) => { if (!facts.some((fact) => fact.label === label)) facts.push({ label, value }); };
  const storage = title.match(/\b(\d+(?:[.,]\d+)?)\s*(tb|gb)\b(?!\s*(?:de\s*)?ram\b)/i);
  const ram = title.match(/\b(\d{1,2})\s*gb\s*(?:de\s*)?ram\b/i);
  const camera = title.match(/\b(\d{2,3})\s*mp\b/i);
  const resolution = title.match(/\b(4k|8k|full\s*hd|fhd\+?|qhd|2k|hd\+?)\b/i);
  const refresh = title.match(/\b(\d{2,3})\s*hz\b/i);
  const battery = title.match(/\b(\d{3,5})\s*mah\b/i);
  const network = title.match(/\b(5g|4g|wifi\s*6e?|wifi\s*7)\b/i);
  if (storage?.[1] && storage[2]) add("Armazenamento", `${storage[1]} ${storage[2].toUpperCase()}`);
  if (ram?.[1]) add("RAM", `${ram[1]} GB`);
  if (camera?.[1]) add("Câmera", `${camera[1]} MP`);
  if (resolution?.[1]) add("Resolução", resolution[1].replace(/\s+/g, " ").toUpperCase());
  if (refresh?.[1]) add("Tela", `${refresh[1]} Hz`);
  if (battery?.[1]) add("Bateria", `${battery[1]} mAh`);
  if (network?.[1]) add("Rede", network[1].toUpperCase());
  return facts;
}

export default function OfferDrawer({ offer, onClose, onFavorite, saved, busy, favoriteError, signedIn }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const storeName = offer.source === "kabum" ? "KaBuM!" : offer.source === "mercado_livre" ? "Mercado Livre" : offer.source;
  const facts = useMemo(() => extractOfferFacts(offer.title), [offer.title]);
  const reviewHighlights = offer.reviewHighlights ?? [];
  const hasReviewData = (offer.rating !== null && offer.rating !== undefined) || (offer.reviewCount !== null && offer.reviewCount !== undefined) || reviewHighlights.length > 0;

  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <>
    <motion.button className="drawer-backdrop" aria-label="Fechar detalhes" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
    <motion.aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.26, ease: [0.2, 0.7, 0.2, 1] }}>
      <div className="drawer-top"><div className="drawer-top-copy"><span>ACHADO</span><strong>Detalhes da oferta</strong></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar painel"><Icon name="close" /></button></div>
      <div className="drawer-photo"><span className="drawer-photo-label">Imagem do anúncio</span>{offer.thumbnail && !imageFailed ? <img src={offer.thumbnail} alt="" onError={() => setImageFailed(true)} /> : <div className="drawer-photo-placeholder"><span>{storeName.slice(0, 2).toUpperCase()}</span><small>Imagem indisponível</small></div>}</div>
      <div className="drawer-product-heading"><div className="drawer-source-line"><span className="drawer-source-mark">{storeName.slice(0, 2).toUpperCase()}</span><p className="drawer-source">{storeName}</p><span className="drawer-source-note">Fonte consultada</span></div><h2 id="drawer-title">{offer.title}</h2></div>
      <div className="drawer-price-block"><div><span className="drawer-price-label">Preço encontrado</span><div className="drawer-price">{money(offer.price)}</div>{offer.originalPrice && offer.originalPrice > offer.price && <p className="drawer-old-price">Preço anterior: {money(offer.originalPrice)}</p>}</div>{offer.freeShipping && <span className="drawer-shipping-badge">Frete grátis</span>}</div>
      {facts.length > 0 && <section className="drawer-facts" aria-label="Dados encontrados no anúncio"><div className="drawer-section-label">Resumo do anúncio</div><div className="drawer-fact-list">{facts.map((fact) => <span key={fact.label}><small>{fact.label}</small><strong>{fact.value}</strong></span>)}</div></section>}
      <dl className="drawer-details">
        <div><dt>Loja</dt><dd>{storeName}</dd></div>
        <div><dt>Frete</dt><dd>{offer.freeShipping ? "Grátis" : `Confira na ${storeName}`}</dd></div>
        <div><dt>Vendedor</dt><dd>{offer.seller || "Não informado"}</dd></div>
        <div><dt>Localização</dt><dd>{offer.location || "Não informada"}</dd></div>
        <div><dt>Consultado em</dt><dd>{new Date(offer.updatedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</dd></div>
      </dl>
      <section className="drawer-reviews" aria-label="Avaliações do produto"><div className="drawer-section-label">Avaliações e comentários</div>{hasReviewData ? <><div className="drawer-review-summary">{offer.rating !== null && offer.rating !== undefined && <strong>★ {offer.rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>}{offer.reviewCount !== null && offer.reviewCount !== undefined && <span>{offer.reviewCount.toLocaleString("pt-BR")} avaliações</span>}</div>{reviewHighlights.length > 0 && <div className="drawer-review-list">{reviewHighlights.map((review) => <blockquote key={review}>“{review}”</blockquote>)}</div>}</> : <p className="drawer-data-missing">A fonte não informou nota ou comentários para esta oferta.</p>}</section>
      <button className="drawer-favorite" type="button" onClick={onFavorite} disabled={busy}><Icon name="heart" /> {saved ? "Remover dos favoritos" : signedIn ? "Salvar nos favoritos" : "Entre para favoritar"}</button>
      {favoriteError && <p className="inline-error" role="alert">{favoriteError}</p>}
      <a className="drawer-link" href={offer.permalink} target="_blank" rel="noopener noreferrer">Abrir oferta na {storeName} <Icon name="external" /></a>
      <p className="drawer-footnote">Preço e disponibilidade podem mudar na loja.</p>
    </motion.aside>
  </>;
}
