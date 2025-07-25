"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    },
    scraper: {
        delayMs: parseInt(process.env.SCRAPER_DELAY_MS || '1000'),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },
    deduplication: {
        enabled: process.env.DEDUPLICATION_ENABLED === 'false' ? false : true,
        similarityThreshold: parseFloat(process.env.DEDUPLICATION_SIMILARITY_THRESHOLD || '0.8'),
    },
    monitoring: {
        maxFailureCount: parseInt(process.env.MONITORING_MAX_FAILURE_COUNT || '3'),
        alertEmail: process.env.MONITORING_ALERT_EMAIL || 'admin@example.com',
    },
};
//# sourceMappingURL=index.js.map