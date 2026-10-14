import { useEffect, useState, type FormEvent } from "react";
import Icon from "../../shared/Icon";
import { getProfile, saveProfile, type UserPreferences } from "../analyzer/analyzer.extra.api";
import "./profile-preferences.css";

type Props = {
  token?: string;
  checking: boolean;
  signedInEmail: string | null;
  mode: "login" | "register";
  email: string;
  password: string;
  busy: boolean;
  error: string;
  onModeChange: (mode: "login" | "register") => void;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFavorites: () => void;
  onLogout: () => void;
};

function PreferencesEditor({ token }: { token: string }) {
  const [preferences, setPreferences] = useState<UserPreferences>({ objective: null, budgetBrl: null, existingEquipment: null, avoidedBrands: [], technicalLevel: null });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { void getProfile(token).then((profile) => { if (profile.preferences) setPreferences(profile.preferences); }).catch(() => setError("Não foi possível carregar as preferências.")); }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try { setPreferences(await saveProfile(preferences, token)); setMessage("Preferências salvas para as próximas análises."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar as preferências."); }
    finally { setBusy(false); }
  }

  return <form className="profile-preferences" onSubmit={(event) => void submit(event)}><div className="profile-preferences-heading"><div><strong>Seu perfil de compra</strong><small>O analisador usará isto como contexto padrão.</small></div><Icon name="sparkles" /></div><label>Uso principal<input value={preferences.objective ?? ""} onChange={(event) => setPreferences((current) => ({ ...current, objective: event.target.value || null }))} placeholder="Jogos, trabalho, edição…" /></label><label>Orçamento máximo<input inputMode="decimal" value={preferences.budgetBrl ?? ""} onChange={(event) => setPreferences((current) => ({ ...current, budgetBrl: event.target.value ? Number(event.target.value.replace(/\./g, "").replace(",", ".")) : null }))} placeholder="Ex.: 5000" /></label><label>Equipamentos que já possui<textarea rows={2} value={preferences.existingEquipment ?? ""} onChange={(event) => setPreferences((current) => ({ ...current, existingEquipment: event.target.value || null }))} placeholder="Ex.: fonte 650 W, monitor 144 Hz…" /></label><label>Marcas que prefere evitar<input value={preferences.avoidedBrands.join(", ")} onChange={(event) => setPreferences((current) => ({ ...current, avoidedBrands: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} placeholder="Separe por vírgula" /></label><label>Nível técnico<select value={preferences.technicalLevel ?? ""} onChange={(event) => setPreferences((current) => ({ ...current, technicalLevel: (event.target.value || null) as UserPreferences["technicalLevel"] }))}><option value="">Não informado</option><option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option><option value="avancado">Avançado</option></select></label><button className="profile-preferences-save" disabled={busy} type="submit">{busy ? "Salvando…" : "Salvar preferências"}</button>{message && <span className="profile-preferences-message">{message}</span>}{error && <span className="profile-preferences-error">{error}</span>}</form>;
}

export default function AccountView({
  token,
  checking,
  signedInEmail,
  mode,
  email,
  password,
  busy,
  error,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onFavorites,
  onLogout,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);

  // Extract username or initial for avatar
  const initial = signedInEmail ? signedInEmail.charAt(0).toUpperCase() : "U";

  return (
    <section className="view account-view-root">
      <div className="account-hero-header">
        <div className="account-security-badge">
          <Icon name="shield" />
          <span>Autenticação Segura • PostgreSQL</span>
        </div>
        <h1>{signedInEmail ? "Minha Conta" : mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</h1>
        <p className="account-subtitle">
          {signedInEmail
            ? "Gerencie sua sessão ativa e acesse suas ofertas salvas."
            : mode === "login"
            ? "Entre com suas credenciais para sincronizar seus favoritos e buscas."
            : "Cadastre-se gratuitamente para salvar e monitorar o preço dos seus produtos."}
        </p>
      </div>

      {checking ? (
        <div className="account-checking-card">
          <div className="auth-spinner" />
          <p>Verificando sessão segura...</p>
        </div>
      ) : signedInEmail ? (
        <div className="account-profile-card">
          <div className="profile-header-info">
            <div className="profile-avatar">
              <span>{initial}</span>
            </div>
            <div className="profile-details">
              <div className="profile-badge-row">
                <span className="profile-status-pill">
                  <Icon name="check" /> Ativo
                </span>
                <span className="profile-db-tag">Banco PostgreSQL</span>
              </div>
              <strong className="profile-email">{signedInEmail}</strong>
              <small className="profile-hint">Sessão criptografada persistida no banco de dados.</small>
            </div>
          </div>

          <div className="profile-actions-grid">
            <button type="button" className="btn-profile-primary" onClick={onFavorites}>
              <Icon name="heart" />
              <span>Ver Meus Favoritos</span>
            </button>
            <button type="button" className="btn-profile-secondary" disabled={busy} onClick={onLogout}>
              <Icon name="logout" />
              <span>{busy ? "Saindo..." : "Encerrar Sessão"}</span>
            </button>
          </div>

          {error && (
            <div className="auth-alert error" role="alert">
              <Icon name="close" />
              <span>{error}</span>
            </div>
          )}
          {token && <PreferencesEditor token={token} />}
        </div>
      ) : (
        <div className="auth-layout-grid">
          {/* Main Card */}
          <div className="auth-card">
            {/* Tab switch */}
            <div className="auth-nav-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                className={`auth-tab-btn ${mode === "login" ? "is-active" : ""}`}
                onClick={() => onModeChange("login")}
              >
                <Icon name="user" />
                <span>Entrar</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                className={`auth-tab-btn ${mode === "register" ? "is-active" : ""}`}
                onClick={() => onModeChange("register")}
              >
                <Icon name="plus" />
                <span>Criar Conta</span>
              </button>
            </div>

            {error && (
              <div className="auth-alert error" role="alert">
                <Icon name="close" />
                <span>{error}</span>
              </div>
            )}

            <form className="auth-form-body" onSubmit={onSubmit}>
              <div className="auth-input-group">
                <label htmlFor="auth-email">E-mail</label>
                <div className="input-with-icon">
                  <span className="input-leading-icon">
                    <Icon name="mail" />
                  </span>
                  <input
                    id="auth-email"
                    type="email"
                    pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
                    title="Por favor, insira um e-mail válido com domínio (ex: usuario@dominio.com)"
                    placeholder="seu.email@exemplo.com"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <div className="label-with-hint">
                  <label htmlFor="auth-password">Senha</label>
                  {mode === "register" && <span className="auth-field-hint">Mín. 8 caracteres</span>}
                </div>
                <div className="input-with-icon">
                  <span className="input-leading-icon">
                    <Icon name="lock" />
                  </span>
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "login" ? "Digite sua senha" : "Crie uma senha segura (mín. 8 dígitos)"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={8}
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-trailing-action"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                    title={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    <Icon name={showPassword ? "eye-off" : "eye"} />
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={busy}>
                {busy ? (
                  <>
                    <span className="auth-spinner mini" />
                    <span>{mode === "login" ? "Entrando..." : "Cadastrando..."}</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "login" ? "Acessar Plataforma" : "Concluir Cadastro"}</span>
                    <Icon name="arrow" />
                  </>
                )}
              </button>
            </form>

            <div className="auth-card-footer">
              {mode === "login" ? (
                <p>
                  Ainda não tem conta?{" "}
                  <button type="button" className="link-inline" onClick={() => onModeChange("register")}>
                    Cadastre-se agora
                  </button>
                </p>
              ) : (
                <p>
                  Já tem uma conta?{" "}
                  <button type="button" className="link-inline" onClick={() => onModeChange("login")}>
                    Fazer login
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Benefits Side Column */}
          <div className="auth-benefits-card">
            <h3>Por que ter uma conta?</h3>
            <ul className="auth-benefits-list">
              <li>
                <div className="benefit-icon">
                  <Icon name="heart" />
                </div>
                <div>
                  <strong>Favoritos e Histórico</strong>
                  <p>Guarde ofertas e acompanhe as variações de preço para comprar no melhor momento.</p>
                </div>
              </li>
              <li>
                <div className="benefit-icon">
                  <Icon name="shield" />
                </div>
                <div>
                  <strong>Segurança com PostgreSQL</strong>
                  <p>Sua senha é protegida com scrypt + salt de 64 bytes e armazenada com segurança.</p>
                </div>
              </li>
              <li>
                <div className="benefit-icon">
                  <Icon name="chat" />
                </div>
                <div>
                  <strong>Busca Inteligente por IA</strong>
                  <p>Ollama local interpreta suas buscas em linguagem natural sem limites.</p>
                </div>
              </li>
            </ul>

            <div className="auth-db-status-badge">
              <span className="status-dot green" />
              <span>Banco PostgreSQL conectado e operando</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
