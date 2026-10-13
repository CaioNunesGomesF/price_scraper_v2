import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";
import { redact } from "../utils/redact.js";

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Dados de entrada inválidos.",
      details: error.flatten(),
    });
    return;
  }

  if (error instanceof AppError) {
    console.error({ name: error.name, message: error.message, details: redact(error.details) });
    res.status(error.statusCode).json({ success: false, message: error.message, details: null });
    return;
  }

  console.error({ name: error?.name ?? "Error", message: error?.message ?? "Unknown error" });
  res.status(500).json({ success: false, message: "Erro interno do servidor.", details: null });
};
