import { Router } from 'express';
import { NewsController } from '../controllers/news.controller';

const router = Router();
const newsController = new NewsController();

router.get('/', newsController.getAllNews);

router.get("/:id", newsController.getArticleById);

router.get('/search', newsController.searchNews);

router.get('/categories', newsController.getAvailableCategories);

router.get('/sources', newsController.getAvailableSources);

router.get('/health', newsController.getHealthStatus);

router.get('/source/:source', newsController.getNewsBySource);

export { router as newsRoutes };