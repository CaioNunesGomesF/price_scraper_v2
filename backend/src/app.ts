import express from "express";
import itemRoutes from "./modules/items/items.routes.js";
import llmRoutes from "./modules/llm/llm.routes.js";
import searchRoutes from "./modules/search/search.routes.js";
import mercadoLivreRoutes from "./modules/integrations/mercado-livre/mercado-livre.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import favoritesRoutes from "./modules/favorites/favorites.routes.js";
import partnerStoreRoutes from "./modules/partner-stores/partner-stores.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { responseMiddleware } from "./middlewares/response.middleware.js";

export const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
app.use(responseMiddleware);

app.get("/health", (_req, res) => res.sendSuccess({ status: "ok" }, "API disponivel."));
app.use("/api/items", itemRoutes);
app.use("/api/llm", llmRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/integrations/mercado-livre", mercadoLivreRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/stores", partnerStoreRoutes);

app.use(errorMiddleware);
