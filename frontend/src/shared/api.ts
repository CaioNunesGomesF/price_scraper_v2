type ApiEnvelope<T> = { success: boolean; message?: string; data?: T };

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
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
    throw new ApiError(payload.message || "Não foi possível concluir a operação.", response.status);
  }
  return payload.data as T;
}
