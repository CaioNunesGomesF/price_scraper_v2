import { Router } from "express";
import * as llmController from "./llm.controller.js";

const router = Router();

router.post("/interpret-search", llmController.interpretSearch);
router.post("/compare-offers", llmController.compareOffers);

export default router;
