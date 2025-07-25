"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const logger_1 = require("./utils/logger");
const news_routes_1 = require("./routes/news.routes");
const error_middleware_1 = require("./middleware/error.middleware");
const rate_limit_middleware_1 = require("./middleware/rate-limit.middleware");
const news_sources_1 = require("./config/news-sources");
const config_1 = require("./config");
const app = (0, express_1.default)();
exports.app = app;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, rate_limit_middleware_1.createRateLimiter)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
app.use('/api/news', news_routes_1.newsRoutes);
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
const startServer = () => {
    app.listen(config_1.config.port, () => {
        logger_1.logger.info(`🚀 Server running on port ${config_1.config.port}`);
        logger_1.logger.info(`📰 News scraper ready for ${Object.keys(news_sources_1.newsSources).length} sources`);
        logger_1.logger.info(`🌍 Environment: ${config_1.config.nodeEnv}`);
    });
};
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=app.js.map