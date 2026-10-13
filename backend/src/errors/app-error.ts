export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details: unknown;

  constructor(message: string, statusCode = 500, details: unknown = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Requisição inválida.", details: unknown = null) {
    super(message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado.") {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Autenticação necessária.") {
    super(message, 401);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflito de dados.") {
    super(message, 409);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Servico temporariamente indisponivel.", details: unknown = null) {
    super(message, 503, details);
  }
}
