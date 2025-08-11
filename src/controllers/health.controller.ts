import { Request, Response } from "express";
import { HealthMonitoringService } from "../services/health-monitoring.service";
import { RssScraperService } from "../services/rss-scraper.service";
import prisma from "../utils/prisma";
import { logger } from "../utils/logger";


export class HealthMonitoringController {
    private healthMonitoring = new HealthMonitoringService()

    constructor(){
        this.healthMonitoring = new HealthMonitoringService();
    }

  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { detailed = "true", hours = "24" } = req.query;
      const hoursNum = parseInt(hours as string, 10);

      if (detailed === "true") {
        const [comprehensive, sourceHealth, trends] = await Promise.all([
          HealthMonitoringService.getComprehensiveScrapingStats(hoursNum),
          HealthMonitoringService.getSourceHealthMetrics(),
          HealthMonitoringService.getScrapingTrends(7),
        ]);

        res.json({
          status: comprehensive.summary.totalArticles > 0 ? "healthy" : "warning",
          timestamp: new Date().toISOString(),
          comprehensive,
          sourceHealth,
          trends,
          metadata: {
            generatedAt: new Date().toISOString(),
            period: `${hoursNum} hours`,
            dataFreshness: "real-time",
          },
        });
      } else {
        const [hourly, daily, weekly] = await Promise.all([
          HealthMonitoringService.getScrapingStats(1),
          HealthMonitoringService.getScrapingStats(24),
          HealthMonitoringService.getScrapingStats(168),
        ]);

        res.json({
          status: hourly.totalArticles > 0 ? "healthy" : "warning",
          hourly,
          daily,
          weekly,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error("Error fetching scraping statistics", { error: error.message });
      res.status(500).json({
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  getHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const health = await HealthMonitoringService.getSourceHealthMetrics();

      const overallStatus =
        health.summary.critical > 0
          ? "critical"
          : health.summary.warning > 0
          ? "warning"
          : "healthy";

      res.json({
        status: overallStatus,
        ...health,
        alerts: health.sources
          .filter((s: { health: { status: string; }; }) => s.health.status !== "healthy")
          .map((s: { name: any; health: { status: any; issues: any; }; }) => ({
            source: s.name,
            severity: s.health.status,
            issues: s.health.issues,
          })),
      });
    } catch (error: any) {
      res.status(500).json({
        status: "error",
        error: error.message,
      });
    }
  };

  getPerformance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { period = "24" } = req.query;
      const hours = parseInt(period as string, 10);

      const performanceData = await prisma.$queryRaw<
        Array<{
          source: string;
          total_articles: number;
          avg_content_length: number;
          first_scrape: string;
          last_scrape: string;
          active_days: number;
        }>
      >`
        SELECT 
          source,
          COUNT(*)::int as total_articles,
          AVG(LENGTH(content))::int as avg_content_length,
          MIN("scrapedAt") as first_scrape,
          MAX("scrapedAt") as last_scrape,
          COUNT(DISTINCT DATE("scrapedAt"))::int as active_days
        FROM "Article" 
        WHERE "scrapedAt" >= ${new Date(Date.now() - hours * 60 * 60 * 1000)}
        GROUP BY source
        ORDER BY total_articles DESC
      `;

      const scoredData = performanceData.map((source) => {
        const expectedDailyArticles = 10;
        const actualDailyAvg = source.total_articles / Math.max(1, source.active_days);
        const performanceScore = Math.min(
          100,
          (actualDailyAvg / expectedDailyArticles) * 100
        );

        return {
          ...source,
          performance_score: Math.round(performanceScore),
          daily_average: Math.round(actualDailyAvg * 100) / 100,
          content_quality_score:
            source.avg_content_length > 500
              ? 100
              : Math.round((source.avg_content_length / 500) * 100),
        };
      });

      res.json({
        period: `${hours} hours`,
        sources: scoredData,
        summary: {
          total_sources: scoredData.length,
          avg_performance: Math.round(
            scoredData.reduce((sum, s) => sum + s.performance_score, 0) / scoredData.length
          ),
          top_performer: scoredData[0]?.source,
          needs_attention: scoredData.filter((s) => s.performance_score < 50).length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        status: "error",
        error: error.message,
      });
    }
  };
}

