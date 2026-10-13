import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent } from "react";
import AccountView from "./features/auth/AccountView";
import { getCurrentUser, login, logout as logoutSession, register } from "./features/auth/auth.api";
import FavoritesView from "./features/favorites/FavoritesView";
import { addFavorite, listFavorites, removeFavorite, type Favorite } from "./features/favorites/favorites.api";
import Sidebar from "./features/navigation/Sidebar";
import { tabOrder, type Tab } from "./features/navigation/navigation.types";
import ChatView from "./features/search/ChatView";
import Dashboard from "./features/search/Dashboard";
import OfferDrawer from "./features/search/OfferDrawer";
import { searchOffers } from "./features/search/search.api";
import type { Offer, SearchResult } from "./features/search/search.types";
import AddStoreView from "./features/stores/AddStoreView";
import { getStoreDirectory, submitStore as submitPartnerStore, type StoreDirectory, type StoreSubmission } from "./features/stores/stores.api";
import StoresView from "./features/stores/StoresView";
import { ApiError } from "./shared/api";
import Icon from "./shared/Icon";

type AuthState = { token: string; email: string };
const sessionKey = "achado_session";

export default function App() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
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
  const [storeDirectory, setStoreDirectory] = useState<StoreDirectory | null>(null);
  const [storeDirectoryLoading, setStoreDirectoryLoading] = useState(false);
  const [storeDirectoryError, setStoreDirectoryError] = useState("");
  const [storeSubmissionBusy, setStoreSubmissionBusy] = useState(false);
  const [storeSubmissionError, setStoreSubmissionError] = useState("");
  const [storeSubmissionSuccess, setStoreSubmissionSuccess] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => { void loadStoreDirectory(); }, []);
  useEffect(() => {
    const token = sessionStorage.getItem(sessionKey);
    if (!token) { setAuthChecking(false); return; }
    let active = true;
    getCurrentUser(token)
      .then(({ user }) => { if (active) { setAuth({ token, email: user.email }); void loadFavorites(token); } })
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
    setAuthBusy(true); setAuthError("");
    try {
      const data = await (authMode === "login" ? login : register)({ email, password });
      sessionStorage.setItem(sessionKey, data.token);
      setAuth({ token: data.token, email: data.user.email });
      setPassword("");
      navigate("favorites");
      await loadFavorites(data.token);
    } catch (cause) { setAuthError(cause instanceof Error ? cause.message : "Não foi possível entrar."); }
    finally { setAuthBusy(false); }
  }

  async function logout() {
    if (!auth || authBusy) return;
    setAuthBusy(true); setAuthError("");
    try {
      await logoutSession(auth.token);
      sessionStorage.removeItem(sessionKey);
      setAuth(null); setFavorites([]); setFavoriteError(""); navigate("account");
    } catch (cause) { setAuthError(cause instanceof Error ? cause.message : "Não foi possível encerrar a sessão."); }
    finally { setAuthBusy(false); }
  }

  async function toggleFavorite(offer: Offer) {
    if (!auth) { setSelectedOffer(null); navigate("account"); return; }
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

  function reset() {
    abortRef.current?.abort();
    setQuery(""); setSubmittedQuery(""); setResult(null); setError(""); setLoading(false); setSelectedOffer(null); navigate("chat");
    inputRef.current?.focus();
  }

  async function search(value: string) {
    const prompt = value.trim();
    if (!prompt || loading) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setSubmittedQuery(prompt); setQuery(""); setResult(null); setError(""); setSelectedOffer(null); setLoading(true);
    navigate("chat");
    try {
      const found = await searchOffers(prompt, controller.signal);
      if (!controller.signal.aborted) setResult(found);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível concluir a busca.");
    } finally {
      if (abortRef.current === controller) { abortRef.current = null; setLoading(false); }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void search(query); }

  const headerTitle: Record<Tab, string> = {
    chat: submittedQuery ? "Comparação de ofertas" : "Nova conversa",
    dashboard: "Dashboard",
    favorites: "Favoritos",
    stores: "Lojas e fontes",
    "add-store": "Cadastrar loja",
    account: "Minha conta",
  };

  return <main className="app-shell">
    <Sidebar tab={tab} open={sidebarOpen} reducedMotion={reducedMotion} submittedQuery={submittedQuery} favoriteCount={favorites.length} signedInEmail={auth?.email ?? null} onNavigate={navigate} onReset={reset} onClose={() => setSidebarOpen(false)} />
    <div className="main-pane">
      <header className="chat-header"><button className="menu-toggle" type="button" aria-label="Abrir menu" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></button><span>{headerTitle[tab]}</span><span className="header-source">Achado</span></header>
      <div className="conversation-scroll" ref={scrollRef}>
        <AnimatePresence mode="wait" initial={false} custom={tabDirection} onExitComplete={() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }}>
          <motion.div key={tab} className="tab-panel" custom={tabDirection} initial={reducedMotion ? false : "enter"} animate="center" exit={reducedMotion ? undefined : "exit"} variants={{ enter: (direction: number) => ({ opacity: 0, x: direction * 16 }), center: { opacity: 1, x: 0 }, exit: (direction: number) => ({ opacity: 0, x: direction * -10 }) }} transition={reducedMotion ? { duration: 0 } : { duration: 0.19, ease: [0.22, 1, 0.36, 1] }}>
            {tab === "chat" && <ChatView submittedQuery={submittedQuery} result={result} loading={loading} error={error} onSuggestion={setQuery} onRetry={() => void search(submittedQuery)} onSelectOffer={setSelectedOffer} inputRef={inputRef} />}
            {tab === "dashboard" && <Dashboard query={submittedQuery} offers={result?.offers ?? null} onSearch={() => navigate("chat")} />}
            {tab === "favorites" && <FavoritesView checking={authChecking} loading={favoritesLoading} signedIn={Boolean(auth)} favorites={favorites} busy={favoriteBusy} error={favoriteError} onAccount={() => navigate("account")} onSearch={() => navigate("chat")} onSelectOffer={setSelectedOffer} onRemove={(offer) => void toggleFavorite(offer)} />}
            {tab === "stores" && <StoresView sources={storeDirectory?.searchSources ?? []} stores={storeDirectory?.partnerStores ?? []} loading={storeDirectoryLoading} error={storeDirectoryError} onAddStore={() => navigate("add-store")} onRetry={() => void loadStoreDirectory()} />}
            {tab === "add-store" && <AddStoreView busy={storeSubmissionBusy} error={storeSubmissionError} success={storeSubmissionSuccess} onSubmit={(data) => void submitStore(data)} />}
            {tab === "account" && <AccountView checking={authChecking} signedInEmail={auth?.email ?? null} mode={authMode} email={email} password={password} busy={authBusy} error={authError} onModeChange={(mode) => { setAuthMode(mode); setAuthError(""); }} onEmailChange={setEmail} onPasswordChange={setPassword} onSubmit={(event) => void submitAuth(event)} onFavorites={() => navigate("favorites")} onLogout={() => void logout()} />}
          </motion.div>
        </AnimatePresence>
      </div>
      {tab === "chat" && <div className="composer-zone"><form className="composer" onSubmit={submit}><textarea ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void search(query); } }} placeholder="Descreva o que você procura" rows={1} aria-label="Descreva o que procura" /><div className="composer-actions"><span>Inclua uso, orçamento e prioridades</span><button type="submit" disabled={!query.trim() || loading} aria-label="Buscar ofertas"><Icon name="arrow" /></button></div></form><p>Preços e disponibilidade são confirmados na loja.</p></div>}
    </div>
    <AnimatePresence>{selectedOffer && <OfferDrawer key={selectedOffer.id} offer={selectedOffer} onClose={() => { setSelectedOffer(null); setFavoriteError(""); }} onFavorite={() => void toggleFavorite(selectedOffer)} saved={favorites.some((item) => item.offerId === selectedOffer.id)} busy={favoriteBusy} favoriteError={favoriteError} signedIn={Boolean(auth)} />}</AnimatePresence>
  </main>;
}
