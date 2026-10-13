import { Router } from "express";
import * as controller from "./mercado-livre.controller.js";

const router = Router();

router.get("/connect", controller.connect);
router.get("/callback", controller.callback);
router.post("/notifications", controller.receiveNotification);

export default router;
