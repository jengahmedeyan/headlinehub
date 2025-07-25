"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsController = void 0;
const news_service_1 = require("../services/news.service");
const logger_1 = require("../utils/logger");
class NewsController {
    constructor() {
        this.getAllNews = async (req, res) => {
            try {
                const result = await this.newsService.getAllNews();
                if (result.success) {
                    res.json(result);
                }
                else {
                    res.status(500).json(result);
                }
            }
            catch (error) {
                logger_1.logger.error('Error in getAllNews controller:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    data: [],
                    count: 0,
                    sources: [],
                    scrapedAt: new Date(),
                    duplicatesRemoved: 0,
                });
            }
        };
        this.getNewsBySource = async (req, res) => {
            try {
                const { source } = req.params;
                const result = await this.newsService.getNewsBySource(source);
                if (result.success) {
                    res.json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                logger_1.logger.error('Error in getNewsBySource controller:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    data: [],
                    count: 0,
                    sources: [],
                    scrapedAt: new Date(),
                    duplicatesRemoved: 0,
                });
            }
        };
        this.getAvailableSources = async (req, res) => {
            try {
                const { newsSources } = await Promise.resolve().then(() => __importStar(require('../config/news-sources')));
                const sources = Object.values(newsSources).map(source => ({
                    name: source.name,
                    url: source.url,
                }));
                res.json({
                    success: true,
                    sources,
                    count: sources.length,
                });
            }
            catch (error) {
                logger_1.logger.error('Error in getAvailableSources controller:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        };
        this.getHealthStatus = async (req, res) => {
            try {
                const result = await this.newsService.getHealthStatus();
                if (result.success) {
                    res.json(result);
                }
                else {
                    res.status(500).json(result);
                }
            }
            catch (error) {
                logger_1.logger.error('Error in getHealthStatus controller:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        };
        this.newsService = new news_service_1.NewsService();
    }
}
exports.NewsController = NewsController;
//# sourceMappingURL=news.controller.js.map