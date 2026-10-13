import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { ConflictError, UnauthorizedError } from "../../errors/app-error.js";
import type { CredentialsDTO } from "./auth.zod.js";
import * as repository from "./auth.repository.js";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const passwordHash = (value: string) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(value, salt, 64).toString("hex")}`; };
const passwordMatches = (value: string, stored: string) => { const [salt, expected] = stored.split(":"); if (!salt || !expected) return false; const actual = scryptSync(value, salt, 64).toString("hex"); return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex")); };
async function session(userId: string, email: string) { const token = randomBytes(32).toString("hex"); await repository.createSession(userId, hash(token), new Date(Date.now() + 30 * 86400_000)); return { token, user: { id: userId, email } }; }
export async function register(data: CredentialsDTO) { if (await repository.findUserByEmail(data.email)) throw new ConflictError("Este e-mail ja esta cadastrado."); const user = await repository.createUser(data.email, passwordHash(data.password)); if (!user) throw new Error("Nao foi possivel criar a conta."); return session(user.id, user.email); }
export async function login(data: CredentialsDTO) { const user = await repository.findUserByEmail(data.email); if (!user || !passwordMatches(data.password, user.passwordHash)) throw new UnauthorizedError("E-mail ou senha invalidos."); return session(user.id, user.email); }
export async function authenticate(authorization?: string) { const token = authorization?.replace(/^Bearer\s+/i, ""); if (!token) throw new UnauthorizedError("Faca login para continuar."); const user = await repository.findActiveSession(hash(token)); if (!user) throw new UnauthorizedError("Sua sessao expirou. Entre novamente."); return user; }
export async function logout(authorization?: string) { const token = authorization?.replace(/^Bearer\s+/i, ""); if (!token) throw new UnauthorizedError("Faca login para continuar."); await repository.deleteSession(hash(token)); }
