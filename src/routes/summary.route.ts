import { Router } from "express";
import { SummaryController } from "../controllers/summary.controller";

const router = Router();
const summaryController = new SummaryController();

router.post("/", summaryController.createSummary);
router.post("/generate", summaryController.generateSummary);
router.post("/bulk", summaryController.getBulkSummaries);
router.get("/:articleId", summaryController.getSummary);
router.delete("/:articleId", summaryController.deleteSummary);

export { router as summaryRoutes };
