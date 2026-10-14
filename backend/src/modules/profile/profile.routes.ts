import { Router } from "express";
import * as controller from "./profile.controller.js";

const router = Router();
router.get("/", controller.get);
router.patch("/", controller.update);
export default router;
