import { Response, NextFunction, Request } from "express";

declare global {
  namespace Express {
    interface Response {
      sendSuccess: (data?: unknown, message?: string, statusCode?: number) => Response;
    }
  }
}

export function responseMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.sendSuccess = (data = null, message = "Operação realizada com sucesso.", statusCode = 200) =>
    res.status(statusCode).json({ success: true, message, data });
  next();
}
