import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent } from "react";
import AccountView from "./features/auth/AccountView";
import { getCurrentUser, login, logout as logoutSession, register } from "./features/auth/auth.api";
import FavoritesView from "./features/favorites/FavoritesView";
import { addFavorite, listFavorites, removeFavorite, type Favorite } from "./features/favorites/favorites.api";
import Sidebar from "./features/navigation/Sidebar";
import { tabOrder, type Tab } from "./features/navigation/navigation.types";
import ChatView from "./features/search/ChatView";
import ComparisonDrawer from "./features/search/ComparisonDrawer";
import Dashboard from "./features/search/Dashboard";
import OfferDrawer from "./features/search/OfferDrawer";
import { compareOffers as requestComparison, deleteChatSession, listChatSessions, searchOffers } from "./features/search/search.api";
import type { ChatSession, ChatTurn, ComparisonAnalysis, Offer, SearchResult } from "./features/search/search.types";
import AddStoreView from "./features/stores/AddStoreView";
import { getStoreDirectory, submitStore as submitPartnerStore, type StoreDirectory, type StoreSubmission } from "./features/stores/stores.api";
import StoresView from "./features/stores/StoresView";
import { ApiError } from "./shared/api";
import Icon from "./shared/Icon";
import { playUiSound } from "./shared/ui-sound";

type AuthState = { token: string; email: string };
const sessionKey = "achado_session";

function createInstantComparison(offers: Offer[]): ComparisonAnalysis {
  const sorted = [...offers].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0]!;
  const highest = sorted[sorted.length - 1]!;
  const average = offers.reduce((sum, offer) => sum + offer.price, 0) / offers.length;
  const money = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return {
    summary: `Comparei ${offers.length} ofertas pelo preço, loja e frete disponíveis. A opção mais barata é ${cheapest.title}.`,
    recommendation: `A menor oferta está em ${cheapest.title}, por ${money(cheapest.price)}. Confirme garantia, vendedor e frete antes de comprar.`,
    priceInsight: `A média da seleção é ${money(average)} e a diferença entre a maior e a menor oferta é ${money(highest.price - cheapest.price)}.`,
    bestOfferId: cheapest.id,
    highlights: sorted.map((offer, index) => ({
      offerId: offer.id,
      label: index === 0 ? "Menor preço" : offer.freeShipping ? "Frete grátis" : "Alternativa",
      text: `${money(offer.price)} na ${offer.source}${offer.freeShipping ? ", com frete grátis" : ""}.`,
    })),
  };
}

export default function App() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [compareSelection, setCompareSelection] = useState<Offer[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonAnalysis, setComparisonAnalysis] = useState<ComparisonAnalysis | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [tabDirection, setTabDirection] = useState(1);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  const [chatSessionsLoading, setChatSessionsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [storeDirectory, setStoreDirectory] = useState<StoreDirectory | null>(null);
  const [storeDirectoryLoading, setStoreDirectoryLoading] = useState(false);
  const [storeDirectoryError, setStoreDirectoryError] = useState("");
  const [storeSubmissionBusy, setStoreSubmissionBusy] = useState(false);
  const [storeSubmissionError, setStoreSubmissionError] = useState("");
  const [storeSubmissionSuccess, setStoreSubmissionSuccess] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => { void loadStoreDirectory(); }, []);
  useEffect(() => { setSoundEnabled(window.localStorage.getItem("achado_sounds") !== "off"); }, []);
  useEffect(() => {
    const token = sessionStorage.getItem(sessionKey);
    if (!token) { setAuthChecking(false); return; }
    let active = true;
    getCurrentUser(token)
      .then(({ user }) => {
        if (active) {
          setAuth({ token, email: user.email });
          void loadFavorites(token);
          void loadChatSessions(token);
        }
      })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) sessionStorage.removeItem(sessionKey);
        else setAuthError("Não foi possível verificar sua sessão. Recarregue a página para tentar novamente.");
      })
      .finally(() => { if (active) setAuthChecking(false); });
    return () => { active = false; };
  }, []);

  async function loadFavorites(token: string) {
    setFavoritesLoading(true);
    try { setFavorites(await listFavorites(token)); }
    catch (cause) { setFavoriteError(cause instanceof Error ? cause.message : "Não foi possível carregar os favoritos."); }
    finally { setFavoritesLoading(false); }
  }

  async function loadChatSessions(token: string) {
    setChatSessionsLoading(true);
    try {
      const sessions = await listChatSessions(token);
      setChatSessions(sessions);
    } catch (cause) {
      console.error("Não foi possível carregar o histórico de buscas:", cause);
    } finally {
      setChatSessionsLoading(false);
    }
  }


  async function loadStoreDirectory() {
    setStoreDirectoryLoading(true); setStoreDirectoryError("");
    try { setStoreDirectory(await getStoreDirectory()); }
    catch (cause) { setStoreDirectoryError(cause instanceof Error ? cause.message : "Não foi possível carregar as lojas."); }
    finally { setStoreDirectoryLoading(false); }
  }

  async function submitStore(data: StoreSubmission) {
    if (storeSubmissionBusy) return;
    setStoreSubmissionBusy(true); setStoreSubmissionError(""); setStoreSubmissionSuccess("");
    try {
      const result = await submitPartnerStore(data);
      setStoreSubmissionSuccess(`${result.productCount} ${result.productCount === 1 ? "produto enviado" : "produtos enviados"} para análise.`);
    } catch (cause) { setStoreSubmissionError(cause instanceof Error ? cause.message : "Não foi possível enviar o cadastro."); }
    finally { setStoreSubmissionBusy(false); }
  }

  function navigate(next: Tab) {
    if (next !== tab) setTabDirection(tabOrder.indexOf(next) > tabOrder.indexOf(tab) ? 1 : -1);
    setTab(next); setSidebarOpen(false); setFavoriteError("");
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authBusy) return;

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      setAuthError("Por favor, insira um e-mail válido (ex.: usuario@dominio.com).");
      return;
    }

    if (password.length < 8) {
      setAuthError("A senha precisa ter no mínimo 8 caracteres.");
      return;
    }

    setAuthBusy(true); setAuthError("");
    try {
      const data = await (authMode === "login" ? login : register)({ email: trimmedEmail, password });
      sessionStorage.setItem(sessionKey, data.token);
      setAuth({ token: data.token, email: data.user.email });
      setPassword("");
      setTab("chat");
      await Promise.all([loadFavorites(data.token), loadChatSessions(data.token)]);
    } catch (cause) { setAuthError(cause instanceof Error ? cause.message : "Não foi possível entrar."); }
    finally { setAuthBusy(false); }
  }

  async function logout() {
    if (!auth || authBusy) return;
    setAuthBusy(true); setAuthError("");
    try {
      await logoutSession(auth.token);
    } catch {
      // Ignore session revocation errors on server
    } finally {
      sessionStorage.removeItem(sessionKey);
      setAuth(null);
      setFavorites([]);
      setChatSessions([]);
      setChatTurns([]);
      setActiveSessionId(null);
      setFavoriteError("");
      setSubmittedQuery("");
      setResult(null);
      setQuery("");
      setCompareSelection([]);
      setComparisonOpen(false);
      setComparisonAnalysis(null);
      setTab("chat");
      setAuthBusy(false);
    }
  }

  async function toggleFavorite(offer: Offer) {
    if (!auth) return;
    if (favoriteBusy) return;
    setFavoriteBusy(true); setFavoriteError("");
    try {
      const existing = favorites.find((item) => item.offerId === offer.id);
      if (existing) {
        await removeFavorite(auth.token, existing.id);
        setFavorites((current) => current.filter((item) => item.id !== existing.id));
      } else {
        const created = await addFavorite(auth.token, offer);
        setFavorites((current) => [created, ...current]);
      }
    } catch (cause) { setFavoriteError(cause instanceof Error ? cause.message : "Não foi possível atualizar o favorito."); }
    finally { setFavoriteBusy(false); }
  }

  function toggleCompareOffer(offer: Offer) {
    setCompareSelection((current) => {
      if (current.some((item) => item.id === offer.id)) return current.filter((item) => item.id !== offer.id);
      if (current.length >= 8) return current;
      return [...current, offer];
    });
    setComparisonAnalysis(null);
    setComparisonError("");
  }

  async function analyzeComparison(offers = compareSelection) {
    if (offers.length < 2 || comparisonLoading) return;
    setComparisonAnalysis(createInstantComparison(offers));
    setComparisonLoading(true);
    setComparisonError("");
    try {
      setComparisonAnalysis(await requestComparison(offers, auth?.token));
    } catch (cause) {
      setComparisonError(cause instanceof Error ? cause.message : "Não foi possível analisar estas ofertas.");
    } finally {
      setComparisonLoading(false);
    }
  }

  function openComparison() {
    if (compareSelection.length < 2) return;
    setComparisonOpen(true);
    void analyzeComparison(compareSelection);
  }

  function removeFromComparison(offerId: string) {
    setCompareSelection((current) => current.filter((offer) => offer.id !== offerId));
    setComparisonAnalysis(null);
    setComparisonError("");
  }

  function reset() {
    abortRef.current?.abort();
    setActiveSessionId(null);
    setQuery(""); setSubmittedQuery(""); setResult(null); setError(""); setLoading(false); setChatTurns([]); setSelectedOffer(null); setCompareSelection([]); setComparisonOpen(false); setComparisonAnalysis(null); navigate("chat");
    inputRef.current?.focus();
  }

  async function search(value: string, retryTurnId?: string) {
    const prompt = value.trim();
    if (!prompt || loading) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const turnId = retryTurnId ?? `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    playUiSound("send", soundEnabled);
    setSubmittedQuery(prompt); setQuery(""); setResult(null); setError(""); setSelectedOffer(null); setCompareSelection([]); setComparisonOpen(false); setComparisonAnalysis(null); setComparisonError(""); setLoading(true);
    setChatTurns((current) => retryTurnId
      ? current.map((turn) => turn.id === turnId ? { ...turn, prompt, result: null, loading: true, error: "" } : turn)
      : [...current, { id: turnId, prompt, result: null, loading: true, error: "" }]);
    navigate("chat");
    try {
      const found = await searchOffers(prompt, auth?.token, controller.signal);
      if (!controller.signal.aborted) {
        setResult(found);
        setError("");
        setChatTurns((current) => current.map((turn) => turn.id === turnId ? { ...turn, result: found, loading: false, error: "" } : turn));
        playUiSound("success", soundEnabled);
        if (found.id) {
          setActiveSessionId(found.id);
          const newSession: ChatSession = {
            id: found.id,
            prompt,
            interpretation: found.interpretation,
            offers: found.offers,
            createdAt: found.createdAt || new Date().toISOString(),
          };
          setChatSessions((prev) => [newSession, ...prev.filter((s) => s.id !== found.id)]);
        }
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        const message = cause instanceof Error ? cause.message : "Não foi possível concluir a busca.";
        setError(message);
        setChatTurns((current) => current.map((turn) => turn.id === turnId ? { ...turn, loading: false, error: message } : turn));
        playUiSound("error", soundEnabled);
      }
    } finally {
      if (abortRef.current === controller) { abortRef.current = null; setLoading(false); }
    }
  }

  function selectSession(session: ChatSession) {
    abortRef.current?.abort();
    setActiveSessionId(session.id);
    setSubmittedQuery(session.prompt);
    const sessionResult = {
      id: session.id,
      prompt: session.prompt,
      interpretation: session.interpretation,
      offers: session.offers,
      createdAt: session.createdAt,
    };
    setResult(sessionResult);
    setChatTurns([{ id: session.id, prompt: session.prompt, result: sessionResult, loading: false, error: "" }]);
    setError("");
    setSelectedOffer(null);
    navigate("chat");
  }

  async function removeSession(sessionId: string) {
    if (!auth) return;
    try {
      await deleteChatSession(auth.token, sessionId);
      setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        reset();
      }
    } catch (cause) {
      console.error("Não foi possível excluir a busca:", cause);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void search(query); }

  function toggleSound() {
    setSoundEnabled((current) => {
      const next = !current;
      window.localStorage.setItem("achado_sounds", next ? "on" : "off");
      if (next) playUiSound("success", true);
      return next;
    });
  }

  const headerTitle: Record<Tab, string> = {
    chat: submittedQuery ? "Comparação de ofertas" : "Nova conversa",
    dashboard: "Dashboard",
    favorites: "Favoritos",
    stores: "Lojas e fontes",
    "add-store": "Cadastrar loja",
    account: "Minha conta",
  };

  if (authChecking) {
    return (
      <div className="auth-gate-wrapper auth-gate-loading-center">
        <div className="auth-gate-loading-box">
          <div className="auth-spinner" />
          <p>Verificando sessão segura...</p>
        </div>
      </div>
    );
  }

  if (!auth && tab !== "chat") {
    return (
      <div className="auth-gate-wrapper">
        <header className="auth-gate-header">
          <div className="auth-gate-brand">
            <span className="brand-symbol"><span /></span>
            <span className="brand-title">achado</span>
            <span className="brand-badge">Comparador Inteligente</span>
          </div>
          <div className="auth-gate-header-right">
            <span className="auth-gate-secure-pill">
              <Icon name="shield" />
              <span>Acesso com Autenticação</span>
            </span>
          </div>
        </header>

        <main className="auth-gate-content">
          <AccountView
            checking={false}
            signedInEmail={null}
            mode={authMode}
            email={email}
            password={password}
            busy={authBusy}
            error={authError}
            onModeChange={(nextMode) => {
              setAuthMode(nextMode);
              setAuthError("");
            }}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={(event) => void submitAuth(event)}
            onFavorites={() => {}}
            onLogout={() => {}}
          />
        </main>

        <footer className="auth-gate-footer">
          <p>Achado • Sistema de busca e monitoramento de preços protegido por login e PostgreSQL</p>
        </footer>
      </div>
    );
  }

  return <main className="app-shell">
    <Sidebar
      tab={tab}
      open={sidebarOpen}
      reducedMotion={reducedMotion}
      submittedQuery={submittedQuery}
      favoriteCount={favorites.length}
      signedInEmail={auth?.email ?? null}
      sessions={chatSessions}
      activeSessionId={activeSessionId}
      sessionsLoading={chatSessionsLoading}
      onSelectSession={selectSession}
      onDeleteSession={(sessionId) => void removeSession(sessionId)}
      onNavigate={navigate}
      onReset={reset}
      onClose={() => setSidebarOpen(false)}
    />
    <div className="main-pane">
      <header className="chat-header">
        <button className="menu-toggle" type="button" aria-label="Abrir menu" onClick={() => setSidebarOpen(true)}>
          <Icon name="menu" />
        </button>
        <span className="header-title">{headerTitle[tab]}</span>
        <div className="header-actions">
          <span className="header-source">Achado</span>
          <button className="sound-toggle" type="button" onClick={toggleSound} aria-label={soundEnabled ? "Desligar sons" : "Ligar sons"} title={soundEnabled ? "Desligar sons" : "Ligar sons"}>
            <Icon name={soundEnabled ? "volume" : "volume-off"} />
          </button>
          {auth ? <div className="header-user-group">
            <button
              className={`header-auth-chip ${tab === "account" ? "is-active" : ""}`}
              type="button"
              onClick={() => navigate("account")}
              title={`Conectado como ${auth.email}`}
            >
              <span className="header-avatar">{auth.email.charAt(0).toUpperCase()}</span>
              <span className="header-auth-email">{auth.email}</span>
            </button>
            <button
              className="header-logout-btn"
              type="button"
              onClick={() => void logout()}
              title="Encerrar sessão"
              aria-label="Encerrar sessão"
            >
              <Icon name="logout" />
            </button>
          </div> : <button className="header-auth-btn" type="button" onClick={() => navigate("account")}><Icon name="user" /> Entrar</button>}
        </div>
      </header>
      <div className="conversation-scroll" ref={scrollRef}>
        <AnimatePresence mode="wait" initial={false} custom={tabDirection} onExitComplete={() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }}>
          <motion.div key={tab} className="tab-panel" custom={tabDirection} initial={reducedMotion ? false : "enter"} animate="center" exit={reducedMotion ? undefined : "exit"} variants={{ enter: (direction: number) => ({ opacity: 0, x: direction * 16 }), center: { opacity: 1, x: 0 }, exit: (direction: number) => ({ opacity: 0, x: direction * -10 }) }} transition={reducedMotion ? { duration: 0 } : { duration: 0.19, ease: [0.22, 1, 0.36, 1] }}>
            {tab === "chat" && <ChatView turns={chatTurns} onSuggestion={setQuery} onRetry={(turnId, prompt) => void search(prompt, turnId)} onSelectOffer={setSelectedOffer} selectedOffers={compareSelection} onToggleCompare={toggleCompareOffer} inputRef={inputRef} />}
            {tab === "dashboard" && <Dashboard query={submittedQuery} offers={result?.offers ?? null} token={auth?.token} onSearch={() => navigate("chat")} onSelectOffer={setSelectedOffer} />}
            {tab === "favorites" && <FavoritesView checking={authChecking} loading={favoritesLoading} signedIn={Boolean(auth)} favorites={favorites} busy={favoriteBusy} error={favoriteError} onAccount={() => navigate("account")} onSearch={() => navigate("chat")} onSelectOffer={setSelectedOffer} onRemove={(offer) => void toggleFavorite(offer)} onAddFavorite={(offer) => void toggleFavorite(offer)} />}
            {tab === "stores" && <StoresView sources={storeDirectory?.searchSources ?? []} stores={storeDirectory?.partnerStores ?? []} loading={storeDirectoryLoading} error={storeDirectoryError} onAddStore={() => navigate("add-store")} onRetry={() => void loadStoreDirectory()} />}
            {tab === "add-store" && <AddStoreView busy={storeSubmissionBusy} error={storeSubmissionError} success={storeSubmissionSuccess} onSubmit={(data) => void submitStore(data)} onViewStores={() => navigate("stores")} />}
             {tab === "account" && auth && <AccountView token={auth.token} checking={authChecking} signedInEmail={auth.email} mode={authMode} email={email} password={password} busy={authBusy} error={authError} onModeChange={(mode) => { setAuthMode(mode); setAuthError(""); }} onEmailChange={setEmail} onPasswordChange={setPassword} onSubmit={(event) => void submitAuth(event)} onFavorites={() => navigate("favorites")} onLogout={() => void logout()} />}
          </motion.div>
        </AnimatePresence>
      </div>
      {tab === "chat" && <div className="composer-zone"><form className="composer" onSubmit={submit}><textarea ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void search(query); } }} placeholder="Descreva o que você procura" rows={1} aria-label="Descreva o que procura" /><div className="composer-actions"><span>Inclua uso, orçamento e prioridades</span><button type="submit" disabled={!query.trim() || loading} aria-label="Buscar ofertas"><Icon name="arrow" /></button></div></form><p>Preços e disponibilidade são confirmados na loja.</p></div>}
    </div>
    <AnimatePresence>{selectedOffer && <OfferDrawer key={selectedOffer.id} offer={selectedOffer} onClose={() => { setSelectedOffer(null); setFavoriteError(""); }} onFavorite={() => void toggleFavorite(selectedOffer)} saved={favorites.some((item) => item.offerId === selectedOffer.id)} busy={favoriteBusy} favoriteError={favoriteError} signedIn={Boolean(auth)} />}</AnimatePresence>
    {tab === "chat" && compareSelection.length > 0 && <div className="compare-tray"><div><span className="compare-tray-count">{compareSelection.length}</span><span>{compareSelection.length === 1 ? "oferta selecionada" : "ofertas selecionadas"}</span></div><small>{compareSelection.length < 2 ? "Escolha mais uma para comparar" : "Pronto para uma análise de preço"}</small><button type="button" onClick={openComparison} disabled={compareSelection.length < 2}>Comparar ofertas <Icon name="arrow" /></button></div>}
    <AnimatePresence>{comparisonOpen && compareSelection.length >= 2 && <ComparisonDrawer key="comparison" offers={compareSelection} analysis={comparisonAnalysis} loading={comparisonLoading} error={comparisonError} onClose={() => setComparisonOpen(false)} onRemove={removeFromComparison} onAnalyze={() => void analyzeComparison()} />}</AnimatePresence>
  </main>;
}
