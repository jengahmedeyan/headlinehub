import { NewsSource, SourceHealthStatus } from '../models/article.model';
import { config } from '../config';
import { logger } from '../utils/logger';

export class HealthMonitoringService {
  private static healthStatuses = new Map<string, SourceHealthStatus>();

  static initializeSource(source: NewsSource): void {
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

  static recordSuccess(sourceName: string, responseTime: number, articleCount: number): void {
    const status = this.healthStatuses.get(sourceName);
    if (status) {
      status.status = 'healthy';
      status.lastSuccessfulScrape = new Date();
      status.failureCount = 0;
      status.responseTime = responseTime;
      status.articlesScraped = articleCount;
      status.lastError = undefined;

      logger.info(`Source health: ${sourceName} - Healthy (${articleCount} articles, ${responseTime}ms)`);
    }
  }

  static recordFailure(sourceName: string, error: string, responseTime?: number): void {
    const status = this.healthStatuses.get(sourceName);
    if (status) {
      status.failureCount++;
      status.lastError = error;
      status.responseTime = responseTime;

      if (status.failureCount >= config.monitoring.maxFailureCount) {
        status.status = 'critical';
        this.sendAlert(sourceName, status);
      } else if (status.failureCount >= 2) {
        status.status = 'warning';
      }

      logger.warn(`Source health: ${sourceName} - ${status.status.toUpperCase()} (${status.failureCount} failures)`);
    }
  }

  static getHealthStatus(sourceName?: string): SourceHealthStatus | SourceHealthStatus[] {
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

  private static sendAlert(sourceName: string, status: SourceHealthStatus): void {
    const alertMessage = `
    🚨 NEWS SOURCE ALERT 🚨
    
    Source: ${sourceName}
    Status: ${status.status.toUpperCase()}
    Failure Count: ${status.failureCount}
    Last Successful Scrape: ${status.lastSuccessfulScrape || 'Never'}
    Last Error: ${status.lastError}
    
    Please check the source configuration and website status.
    `;

    logger.error(`ALERT: ${sourceName} is ${status.status}`, {
      source: sourceName,
      status: status.status,
      failureCount: status.failureCount,
      lastError: status.lastError,
      alertEmail: config.monitoring.alertEmail
    });

    // In a real implementation, you would send an email here
    console.error(alertMessage);
  }

  static getOverallHealth(): { status: string, healthySources: number, totalSources: number } {
    const statuses = Array.from(this.healthStatuses.values());
    const healthySources = statuses.filter(s => s.status === 'healthy').length;
    const totalSources = statuses.length;

    let overallStatus = 'healthy';
    if (healthySources === 0) {
      overallStatus = 'critical';
    } else if (healthySources < totalSources * 0.7) {
      overallStatus = 'warning';
    }

    return { status: overallStatus, healthySources, totalSources };
  }
}
