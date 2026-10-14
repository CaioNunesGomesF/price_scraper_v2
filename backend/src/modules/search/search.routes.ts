import { Router } from "express";
import * as searchController from "./search.controller.js";

const router = Router();

router.post("/", searchController.searchOffers);
router.get("/dashboard", searchController.listDashboardOffers);
router.get("/sessions", searchController.listSessions);
router.get("/sessions/:id", searchController.getSession);
router.delete("/sessions/:id", searchController.deleteSession);
router.delete("/sessions", searchController.clearSessions);

export default router;

