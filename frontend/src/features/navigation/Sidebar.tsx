import { motion } from "framer-motion";
import Icon from "../../shared/Icon";
import type { ChatSession } from "../search/search.types";
import type { Tab } from "./navigation.types";

type Props = {
  tab: Tab;
  open: boolean;
  reducedMotion: boolean | null;
  submittedQuery: string;
  favoriteCount: number;
  signedInEmail: string | null;
  sessions: ChatSession[];
  activeSessionId: string | null;
  sessionsLoading?: boolean;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onNavigate: (tab: Tab) => void;
  onReset: () => void;
  onClose: () => void;
};

const entries: { tab: Tab; label: string; icon: "chat" | "chart" | "heart" | "search" | "plus" | "sparkles" }[] = [
  { tab: "chat", label: "Conversa", icon: "chat" },
  { tab: "dashboard", label: "Dashboard", icon: "chart" },
  { tab: "favorites", label: "Favoritos", icon: "heart" },
  { tab: "stores", label: "Lojas", icon: "search" },
  { tab: "add-store", label: "Cadastrar loja", icon: "plus" },
];

export default function Sidebar({
  tab,
  open,
  reducedMotion,
  submittedQuery,
  favoriteCount,
  signedInEmail,
  sessions,
  activeSessionId,
  sessionsLoading,
  onSelectSession,
  onDeleteSession,
  onNavigate,
  onReset,
  onClose,
}: Props) {
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
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span className="sidebar-label">Histórico de buscas</span>
          {sessions.length > 0 && <span className="sidebar-history-count">{sessions.length}</span>}
        </div>
        {sessionsLoading ? (
          <div className="sidebar-history-loading">
            <span className="auth-spinner mini" />
            <small>Carregando...</small>
          </div>
        ) : sessions.length > 0 ? (
          <div className="sidebar-history-list">
            {sessions.map((session) => {
              const isActive = activeSessionId === session.id || (!activeSessionId && submittedQuery === session.prompt);
              return (
                <div key={session.id} className={`session-history-item ${isActive ? "is-active" : ""}`}>
                  <button
                    className="session-history-btn"
                    type="button"
                    onClick={() => onSelectSession(session)}
                    title={session.prompt}
                  >
                    <Icon name="chat" />
                    <span className="session-history-title">{session.prompt}</span>
                  </button>
                  <button
                    className="session-delete-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    title="Excluir busca do histórico"
                    aria-label="Excluir busca"
                  >
                    <Icon name="close" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : submittedQuery ? (
          <button className="session-item" type="button" onClick={() => onNavigate("chat")} title={submittedQuery}>
            {submittedQuery}
          </button>
        ) : (
          <p className="sidebar-empty">Suas buscas ficarão salvas no PostgreSQL e aparecerão aqui.</p>
        )}
      </div>
      <button className={`sidebar-account${tab === "account" ? " is-active" : ""}`} type="button" onClick={() => onNavigate("account")}><Icon name="user" /><span>{signedInEmail || "Entrar ou criar conta"}</span></button>
    </aside>
  </>;
}

