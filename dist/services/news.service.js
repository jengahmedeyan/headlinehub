"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsService = void 0;
const scraper_service_1 = require("./scraper.service");
const health_monitoring_service_1 = require("./health-monitoring.service");
const news_sources_1 = require("../config/news-sources");
const deduplication_service_1 = require("../utils/deduplication.service");
const logger_1 = require("../utils/logger");
class NewsService {
    constructor() {
        this.scraperService = new scraper_service_1.ScraperService();
    }
    async getAllNews() {
        try {
            const sources = Object.values(news_sources_1.newsSources);
            const results = await this.scraperService.scrapeMultipleSources(sources);
            const allArticles = [];
            const successfulSources = [];
            results.forEach(result => {
                if (result.success) {
                    allArticles.push(...result.articles);
                    successfulSources.push(result.source);
                }
            });
            const { articles: uniqueArticles, stats } = deduplication_service_1.DeduplicationService.removeDuplicates(allArticles);
            uniqueArticles.sort((a, b) => b.scrapedAt.getTime() - a.scrapedAt.getTime());
            const healthStatus = health_monitoring_service_1.HealthMonitoringService.getHealthStatus();
            logger_1.logger.info(`Total articles scraped: ${allArticles.length} from ${successfulSources.length} sources, ${stats.duplicatesRemoved} duplicates removed`);
            return {
                success: true,
                data: uniqueArticles,
                count: uniqueArticles.length,
                sources: successfulSources,
                scrapedAt: new Date(),
                duplicatesRemoved: stats.duplicatesRemoved,
                healthStatus,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('Error in getAllNews:', { error: errorMessage });
            return {
                success: false,
                data: [],
                count: 0,
                sources: [],
                scrapedAt: new Date(),
                error: errorMessage,
                duplicatesRemoved: 0,
                healthStatus: health_monitoring_service_1.HealthMonitoringService.getHealthStatus(),
            };
        }
    }
    async getNewsBySource(sourceName) {
        try {
            const source = Object.values(news_sources_1.newsSources).find(s => s.name.toLowerCase() === sourceName.toLowerCase());
            if (!source) {
                throw new Error(`News source '${sourceName}' not found`);
            }
            const result = await this.scraperService.scrapeSource(source);
            const { articles: uniqueArticles, stats } = deduplication_service_1.DeduplicationService.removeDuplicates(result.articles);
            const healthStatus = [health_monitoring_service_1.HealthMonitoringService.getHealthStatus(sourceName)];
            return {
                success: result.success,
                data: uniqueArticles,
                count: uniqueArticles.length,
                sources: [result.source],
                scrapedAt: new Date(),
                error: result.error,
                duplicatesRemoved: stats.duplicatesRemoved,
                healthStatus,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error(`Error getting news by source ${sourceName}:`, { error: errorMessage });
            return {
                success: false,
                data: [],
                count: 0,
                sources: [],
                scrapedAt: new Date(),
                error: errorMessage,
                duplicatesRemoved: 0,
                healthStatus: [health_monitoring_service_1.HealthMonitoringService.getHealthStatus(sourceName)],
            };
        }
    }
    async getHealthStatus() {
        try {
            const allStatuses = health_monitoring_service_1.HealthMonitoringService.getHealthStatus();
            const overallHealth = health_monitoring_service_1.HealthMonitoringService.getOverallHealth();
            return {
                success: true,
                data: {
                    overall: overallHealth,
                    sources: allStatuses,
                    timestamp: new Date(),
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('Error getting health status:', { error: errorMessage });
            return {
                success: false,
                data: { error: errorMessage },
            };
        }
    }
}
exports.NewsService = NewsService;
//# sourceMappingURL=news.service.js.map