type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
  details?: {
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
  };
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

const anonymousKeyStorage = "achado_anonymous_key";

export function getAnonymousKey() {
  const current = localStorage.getItem(anonymousKeyStorage);
  if (current) return current;
  const generated = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(anonymousKeyStorage, generated);
  return generated;
}

export async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { ...options, headers });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new ApiError(`Serviço indisponível (HTTP ${response.status}).`, response.status);
  }

  const payload = await response.json() as ApiEnvelope<T>;
  if (!response.ok || !payload.success) {
    let errMessage = payload.message || "Não foi possível concluir a operação.";
    if (payload.details?.fieldErrors) {
      const fieldEntries = Object.entries(payload.details.fieldErrors);
      if (fieldEntries.length > 0) {
        const detailsList = fieldEntries
          .map(([field, errs]) => {
            const label = field === "email" ? "E-mail" : field === "password" ? "Senha" : field;
            const translated = errs.map((e) => e === "Invalid email" ? "formato inválido" : e).join(", ");
            return `${label}: ${translated}`;
          })
          .join(". ");
        errMessage = `${errMessage} (${detailsList})`;
      }
    }
    throw new ApiError(errMessage, response.status);
  }
  return payload.data as T;
}
