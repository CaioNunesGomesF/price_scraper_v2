import { Router } from "express";
import * as llmController from "./llm.controller.js";

const router = Router();

router.post("/interpret-search", llmController.interpretSearch);

export default router;
