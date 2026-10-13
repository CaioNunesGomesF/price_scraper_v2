import { Router } from "express";
import * as searchController from "./search.controller.js";

const router = Router();

router.post("/", searchController.searchOffers);

export default router;
