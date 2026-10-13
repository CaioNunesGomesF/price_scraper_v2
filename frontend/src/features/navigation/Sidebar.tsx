import { motion } from "framer-motion";
import Icon from "../../shared/Icon";
import type { Tab } from "./navigation.types";

type Props = {
  tab: Tab;
  open: boolean;
  reducedMotion: boolean | null;
  submittedQuery: string;
  favoriteCount: number;
  signedInEmail: string | null;
  onNavigate: (tab: Tab) => void;
  onReset: () => void;
  onClose: () => void;
};

const entries: { tab: Tab; label: string; icon: "chat" | "chart" | "heart" | "search" | "plus" }[] = [
  { tab: "chat", label: "Conversa", icon: "chat" },
  { tab: "dashboard", label: "Dashboard", icon: "chart" },
  { tab: "favorites", label: "Favoritos", icon: "heart" },
  { tab: "stores", label: "Lojas", icon: "search" },
  { tab: "add-store", label: "Cadastrar loja", icon: "plus" },
];

export default function Sidebar({ tab, open, reducedMotion, submittedQuery, favoriteCount, signedInEmail, onNavigate, onReset, onClose }: Props) {
  return <>
    {open && <button className="mobile-shade" type="button" aria-label="Fechar menu" onClick={onClose} />}
    <aside className={`sidebar${open ? " sidebar-open" : ""}`} aria-label="Navegação">
      <div className="sidebar-head"><button className="brand" onClick={onReset} type="button" aria-label="Achado, nova busca"><span className="brand-symbol"><span /></span>achado</button><button className="sidebar-close" type="button" aria-label="Fechar menu" onClick={onClose}><Icon name="close" /></button></div>
      <button className="sidebar-new" type="button" onClick={onReset}><Icon name="plus" /> Nova conversa</button>
      <nav className="sidebar-nav" aria-label="Áreas do Achado">
        {entries.map((entry) => <button key={entry.tab} className={tab === entry.tab ? "is-active" : ""} type="button" aria-current={tab === entry.tab ? "page" : undefined} onClick={() => onNavigate(entry.tab)}>
          {tab === entry.tab && <motion.span className="nav-indicator" layoutId="nav-indicator" transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38 }} />}
          <Icon name={entry.icon} /><span className="nav-label">{entry.label}</span>
          {entry.tab === "favorites" && signedInEmail && favoriteCount > 0 && <span className="nav-count">{favoriteCount}</span>}
        </button>)}
      </nav>
      <div className="sidebar-section"><span className="sidebar-label">Nesta sessão</span>{submittedQuery ? <button className="session-item" type="button" onClick={() => onNavigate("chat")} title={submittedQuery}>{submittedQuery}</button> : <p className="sidebar-empty">Sua busca aparece aqui enquanto esta página estiver aberta.</p>}</div>
      <button className={`sidebar-account${tab === "account" ? " is-active" : ""}`} type="button" onClick={() => onNavigate("account")}><Icon name="user" /><span>{signedInEmail || "Entrar ou criar conta"}</span></button>
    </aside>
  </>;
}
