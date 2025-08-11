import { Router } from "express";
import { HealthMonitoringController } from "../controllers/health.controller";

const router = Router();
const healthMonitoringController = new HealthMonitoringController();

router.get("/", healthMonitoringController.getHealth);
router.get("/stats", healthMonitoringController.getStats);
router.get("/performance", healthMonitoringController.getPerformance);

export { router as healthRoutes};
