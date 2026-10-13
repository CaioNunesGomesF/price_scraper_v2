import type { FormEvent } from "react";

type Props = {
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

export default function AccountView({ checking, signedInEmail, mode, email, password, busy, error, onModeChange, onEmailChange, onPasswordChange, onSubmit, onFavorites, onLogout }: Props) {
  return <section className="view account-view">
    <div className="view-heading"><p>Acesso pessoal</p><h1>Minha conta</h1><span>Entre para manter seus favoritos associados ao seu e-mail.</span></div>
    {checking ? <p className="view-status">Verificando sua sessão…</p> : signedInEmail ?
      <div className="account-summary"><span>Conectado como</span><strong>{signedInEmail}</strong><div><button type="button" onClick={onFavorites}>Ver favoritos</button><button type="button" disabled={busy} onClick={onLogout}>{busy ? "Saindo…" : "Sair"}</button></div>{error && <p className="inline-error" role="alert">{error}</p>}</div> :
      <div className="account-form-wrap">
        <div className="auth-switch"><button className={mode === "login" ? "is-active" : ""} type="button" onClick={() => onModeChange("login")}>Entrar</button><button className={mode === "register" ? "is-active" : ""} type="button" onClick={() => onModeChange("register")}>Criar conta</button></div>
        <form className="account-form" onSubmit={onSubmit}>
          <label>E-mail<input type="email" autoComplete="email" value={email} onChange={(event) => onEmailChange(event.target.value)} required /></label>
          <label>Senha<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} value={password} onChange={(event) => onPasswordChange(event.target.value)} required /></label>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <button type="submit" disabled={busy}>{busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}</button>
        </form>
      </div>}
  </section>;
}
