"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsRoutes = void 0;
const express_1 = require("express");
const news_controller_1 = require("../controllers/news.controller");
const router = (0, express_1.Router)();
exports.newsRoutes = router;
const newsController = new news_controller_1.NewsController();
router.get('/', newsController.getAllNews);
router.get('/sources', newsController.getAvailableSources);
router.get('/health', newsController.getHealthStatus);
router.get('/source/:source', newsController.getNewsBySource);
//# sourceMappingURL=news.routes.js.map