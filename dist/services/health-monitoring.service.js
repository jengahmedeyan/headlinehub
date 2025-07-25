"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthMonitoringService = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class HealthMonitoringService {
    static initializeSource(source) {
        if (!this.healthStatuses.has(source.name)) {
            this.healthStatuses.set(source.name, {
                source: source.name,
                status: 'healthy',
                lastSuccessfulScrape: null,
                failureCount: 0,
                articlesScraped: 0,
            });
        }
    }
    static recordSuccess(sourceName, responseTime, articleCount) {
        const status = this.healthStatuses.get(sourceName);
        if (status) {
            status.status = 'healthy';
            status.lastSuccessfulScrape = new Date();
            status.failureCount = 0;
            status.responseTime = responseTime;
            status.articlesScraped = articleCount;
            status.lastError = undefined;
            logger_1.logger.info(`Source health: ${sourceName} - Healthy (${articleCount} articles, ${responseTime}ms)`);
        }
    }
    static recordFailure(sourceName, error, responseTime) {
        const status = this.healthStatuses.get(sourceName);
        if (status) {
            status.failureCount++;
            status.lastError = error;
            status.responseTime = responseTime;
            if (status.failureCount >= config_1.config.monitoring.maxFailureCount) {
                status.status = 'critical';
                this.sendAlert(sourceName, status);
            }
            else if (status.failureCount >= 2) {
                status.status = 'warning';
            }
            logger_1.logger.warn(`Source health: ${sourceName} - ${status.status.toUpperCase()} (${status.failureCount} failures)`);
        }
    }
    static getHealthStatus(sourceName) {
        if (sourceName) {
            return this.healthStatuses.get(sourceName) || {
                source: sourceName,
                status: 'down',
                lastSuccessfulScrape: null,
                failureCount: 0,
                articlesScraped: 0,
            };
        }
        return Array.from(this.healthStatuses.values());
    }
    static sendAlert(sourceName, status) {
        const alertMessage = `
    🚨 NEWS SOURCE ALERT 🚨
    
    Source: ${sourceName}
    Status: ${status.status.toUpperCase()}
    Failure Count: ${status.failureCount}
    Last Successful Scrape: ${status.lastSuccessfulScrape || 'Never'}
    Last Error: ${status.lastError}
    
    Please check the source configuration and website status.
    `;
        logger_1.logger.error(`ALERT: ${sourceName} is ${status.status}`, {
            source: sourceName,
            status: status.status,
            failureCount: status.failureCount,
            lastError: status.lastError,
            alertEmail: config_1.config.monitoring.alertEmail
        });
        // In a real implementation, you would send an email here
        console.error(alertMessage);
    }
    static getOverallHealth() {
        const statuses = Array.from(this.healthStatuses.values());
        const healthySources = statuses.filter(s => s.status === 'healthy').length;
        const totalSources = statuses.length;
        let overallStatus = 'healthy';
        if (healthySources === 0) {
            overallStatus = 'critical';
        }
        else if (healthySources < totalSources * 0.7) {
            overallStatus = 'warning';
        }
        return { status: overallStatus, healthySources, totalSources };
    }
}
exports.HealthMonitoringService = HealthMonitoringService;
HealthMonitoringService.healthStatuses = new Map();
//# sourceMappingURL=health-monitoring.service.js.map