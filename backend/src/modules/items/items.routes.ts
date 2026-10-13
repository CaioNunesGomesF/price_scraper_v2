import { Router } from "express";
import * as itemController from "./items.controller.js";

const router = Router();

router.post("/", itemController.createItem);
router.get("/:id", itemController.getItemById);

export default router;
