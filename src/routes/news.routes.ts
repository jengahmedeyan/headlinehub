import { Router } from "express";
import { NewsController } from "../controllers/news.controller";

const router = Router();
const newsController = new NewsController();

router.get("/", newsController.getAllNews);
router.get("/latest", newsController.getLatestNewsArticles);
router.get("/search", newsController.searchNews);

router.get("/categories", newsController.getAvailableCategories);
router.get("/sources", newsController.getAvailableSources);
router.get("/source/:source", newsController.getNewsBySource);

router.get("/health", newsController.getHealthStatus);
router.get("/test-scrape", newsController.dummyScraper);

router.get("/:id", newsController.getArticleById);

export { router as newsRoutes };
