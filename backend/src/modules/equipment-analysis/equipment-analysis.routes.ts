import { Router } from "express";
import * as controller from "./equipment-analysis.controller.js";

const router = Router();
router.post("/analyses", controller.create);
router.get("/analyses", controller.list);
router.get("/analyses/:id", controller.get);
router.post("/analyses/:id/answers", controller.answer);
router.post("/analyses/:id/run", controller.run);
router.post("/analyses/:id/prices", controller.refreshPrices);
router.delete("/analyses/:id", controller.remove);
router.post("/alerts", controller.createAlert);
router.get("/alerts", controller.listAlerts);
router.patch("/alerts/:id", controller.updateAlert);
router.post("/sources/import", controller.importUrl);
export default router;
