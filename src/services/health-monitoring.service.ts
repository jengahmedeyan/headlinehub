import { NewsSource, SourceHealthStatus } from "../models/article.model";
import { config } from "../config";
import { logger } from "../utils/logger";
import { rssNewsSources } from "../config/rss-news-sources";
import prisma from "../utils/prisma";

export class HealthMonitoringService {
  private static healthStatuses = new Map<string, SourceHealthStatus>();

  static initializeSource = (source: NewsSource): void => {
    if (!this.healthStatuses.has(source.name)) {
      this.healthStatuses.set(source.name, {
        source: source.name,
        status: "healthy",
        lastSuccessfulScrape: null,
        failureCount: 0,
        articlesScraped: 0,
      });
    }
  };

  static recordSuccess = (
    sourceName: string,
    responseTime: number,
    articleCount: number
  ): void => {
    const status = this.healthStatuses.get(sourceName);
    if (status) {
      status.status = "healthy";
      status.lastSuccessfulScrape = new Date();
      status.failureCount = 0;
      status.responseTime = responseTime;
      status.articlesScraped = articleCount;
      status.lastError = undefined;

      logger.info(
        `Source health: ${sourceName} - Healthy (${articleCount} articles, ${responseTime}ms)`
      );
    }
  };

  static recordFailure = (
    sourceName: string,
    error: string,
    responseTime?: number
  ): void => {
    const status = this.healthStatuses.get(sourceName);
    if (status) {
      status.failureCount++;
      status.lastError = error;
      status.responseTime = responseTime;

      if (status.failureCount >= config.monitoring.maxFailureCount) {
        status.status = "critical";
        this.sendAlert(sourceName, status);
      } else if (status.failureCount >= 2) {
        status.status = "warning";
      }

      logger.warn(
        `Source health: ${sourceName} - ${status.status.toUpperCase()} (${
          status.failureCount
        } failures)`
      );
    }
  };

  static getHealthStatus = (
    sourceName?: string
  ): SourceHealthStatus | SourceHealthStatus[] => {
    if (sourceName) {
      return (
        this.healthStatuses.get(sourceName) || {
          source: sourceName,
          status: "down",
          lastSuccessfulScrape: null,
          failureCount: 0,
          articlesScraped: 0,
        }
      );
    }
    return Array.from(this.healthStatuses.values());
  };

  private static sendAlert = (
    sourceName: string,
    status: SourceHealthStatus
  ): void => {
    const alertMessage = `
    🚨 NEWS SOURCE ALERT 🚨
    
    Source: ${sourceName}
    Status: ${status.status.toUpperCase()}
    Failure Count: ${status.failureCount}
    Last Successful Scrape: ${status.lastSuccessfulScrape || "Never"}
    Last Error: ${status.lastError}
    
    Please check the source configuration and website status.
    `;

    logger.error(`ALERT: ${sourceName} is ${status.status}`, {
      source: sourceName,
      status: status.status,
      failureCount: status.failureCount,
      lastError: status.lastError,
      alertEmail: config.monitoring.alertEmail,
    });
    // TODO: send an alert to the telegram admin
    console.error(alertMessage);
  };

  static getOverallHealth = (): {
    status: string;
    healthySources: number;
    totalSources: number;
  } => {
    const statuses = Array.from(this.healthStatuses.values());
    const healthySources = statuses.filter(
      (s) => s.status === "healthy"
    ).length;
    const totalSources = statuses.length;

    let overallStatus = "healthy";
    if (healthySources === 0) {
      overallStatus = "critical";
    } else if (healthySources < totalSources * 0.7) {
      overallStatus = "warning";
    }

    return { status: overallStatus, healthySources, totalSources };
  };

  static getComprehensiveScrapingStats = async (
    hours: number = 24
  ): Promise<any> => {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      const now = new Date();

      const [
        basicStats,
        errorStats,
        contentQualityStats,
        timeDistribution,
        categoryStats,
        duplicateStats,
        performanceMetrics,
      ] = await Promise.all([
        prisma.article.groupBy({
          by: ["source"],
          where: { scrapedAt: { gte: since.toISOString() } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),

        Promise.resolve([]),

        prisma.$queryRaw<
          Array<{
            avg_length: number;
            min_length: number;
            max_length: number;
            count: number;
          }>
        >`
        SELECT 
          AVG(LENGTH(content)) as avg_length,
          MIN(LENGTH(content)) as min_length,
          MAX(LENGTH(content)) as max_length,
          COUNT(*) as count
        FROM "Article" 
        WHERE "scrapedAt" >= ${since}
      `,

        prisma.$queryRaw<
          Array<{ hour: string; count: number; unique_sources: number }>
        >`
        SELECT 
          DATE_TRUNC('hour', "scrapedAt"::timestamp) as hour,
          COUNT(*)::int as count,
          COUNT(DISTINCT source)::int as unique_sources
        FROM "Article" 
        WHERE "scrapedAt" >= ${since}
        GROUP BY hour 
        ORDER BY hour DESC
      `,

        prisma.article.groupBy({
          by: ["category"],
          where: { scrapedAt: { gte: since.toISOString() } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),

        prisma.article.groupBy({
          by: ["hash"],
          where: { scrapedAt: { gte: since.toISOString() } },
          _count: { id: true },
          having: { id: { _count: { gt: 1 } } },
        }),

        prisma.$queryRaw<
          Array<{
            source: string;
            count: number;
            avg_length: number;
            min_scraped_at: string;
            max_scraped_at: string;
          }>
        >`
        SELECT 
          source,
          COUNT(*)::int as count,
          AVG(LENGTH(content))::int as avg_length,
          MIN("scrapedAt") as min_scraped_at,
          MAX("scrapedAt") as max_scraped_at
        FROM "Article" 
        WHERE "scrapedAt" >= ${since}
        GROUP BY source
      `,
      ]);

      const contentQualityResult = contentQualityStats[0];

      return {
        period: `${hours} hours`,
        timestamp: now.toISOString(),
        summary: {
          totalArticles: basicStats.reduce(
            (sum: number, stat) => sum + stat._count.id,
            0
          ),
          uniqueSources: basicStats.length,
          avgContentLength: Math.round(contentQualityResult?.avg_length || 0),
          contentLengthRange: {
            min: contentQualityResult?.min_length || 0,
            max: contentQualityResult?.max_length || 0,
          },
        },
        sources: {
          breakdown: basicStats,
          performance: performanceMetrics.map((source) => ({
            name: source.source,
            articlesCount: source.count,
            avgContentLength: Math.round(source.avg_length || 0),
            firstScraped: source.min_scraped_at,
            lastScraped: source.max_scraped_at,
            consistency: this.calculateConsistencyScore(source),
          })),
        },
        quality: {
          duplicates: {
            count: duplicateStats.length,
            examples: duplicateStats.slice(0, 5),
          },
          categories: categoryStats,
          avgContentLength: Math.round(contentQualityResult?.avg_length || 0),
        },
        temporal: {
          hourlyDistribution: timeDistribution,
          peakHour: this.findPeakHour(timeDistribution),
          consistency: this.calculateTemporalConsistency(timeDistribution),
        },
        errors: {
          bySource: (
            (errorStats as Array<{ source: string; _count: { id: number } }>) ||
            []
          ).reduce((acc: Record<string, number>, stat) => {
            acc[stat.source] = (acc[stat.source] || 0) + stat._count.id;
            return acc;
          }, {}),
          total: (
            (errorStats as Array<{ _count: { id: number } }>) || []
          ).reduce((sum: number, stat) => sum + stat._count.id, 0),
        },
      };
    } catch (error) {
      logger.error("Error getting comprehensive scraping stats", { error });
      throw error;
    }
  };

  static getSourceHealthMetrics = async (): Promise<any> => {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const sourceMetrics = await Promise.all(
        rssNewsSources.map(async (source) => {
          const [recent24h, recent7d, lastSuccessful] = await Promise.all([
            prisma.article.count({
              where: {
                source: source.name,
                scrapedAt: { gte: last24h.toISOString() },
              },
            }),
            prisma.article.count({
              where: {
                source: source.name,
                scrapedAt: { gte: last7d.toISOString() },
              },
            }),
            prisma.article.findFirst({
              where: { source: source.name },
              orderBy: { scrapedAt: "desc" },
              select: { scrapedAt: true },
            }),
          ]);

          const daysSinceLastScrape = lastSuccessful
            ? Math.floor(
                (Date.now() - new Date(lastSuccessful.scrapedAt).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null;

          return {
            name: source.name,
            url: source.url,
            category: (source as any).category || "General",
            health: this.calculateSourceHealth(
              recent24h,
              recent7d,
              daysSinceLastScrape
            ),
            metrics: {
              articles24h: recent24h,
              articles7d: recent7d,
              daysSinceLastScrape,
              expectedFrequency: (source as any).expectedArticlesPerDay || 5,
              lastSuccessfulScrape: lastSuccessful?.scrapedAt,
            },
          };
        })
      );

      return {
        timestamp: new Date().toISOString(),
        sources: sourceMetrics.sort((a, b) => b.health.score - a.health.score),
        summary: {
          healthy: sourceMetrics.filter((s) => s.health.status === "healthy")
            .length,
          warning: sourceMetrics.filter((s) => s.health.status === "warning")
            .length,
          critical: sourceMetrics.filter((s) => s.health.status === "critical")
            .length,
          total: sourceMetrics.length,
        },
      };
    } catch (error) {
      logger.error("Error getting source health metrics", { error });
      throw error;
    }
  };

  static getScrapingStats = async (hours: number = 24): Promise<any> => {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const stats = await prisma.article.groupBy({
        by: ["source"],
        where: {
          scrapedAt: {
            gte: since.toISOString(),
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
      });

      return {
        period: `${hours} hours`,
        totalArticles: stats.reduce((sum, stat) => sum + stat._count.id, 0),
        sourceBreakdown: stats,
      };
    } catch (error) {
      logger.error("Error getting scraping stats", { error });
      throw error;
    }
  };

  static getScrapingTrends = async (days: number = 7): Promise<any> => {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const dailyTrends = await prisma.$queryRaw<
        Array<{
          date: string;
          total_articles: number;
          active_sources: number;
          avg_content_length: number;
          categories_count: number;
        }>
      >`
      SELECT 
        DATE("scrapedAt") as date,
        COUNT(*)::int as total_articles,
        COUNT(DISTINCT source)::int as active_sources,
        AVG(LENGTH(content))::int as avg_content_length,
        COUNT(DISTINCT category)::int as categories_count
      FROM "Article" 
      WHERE "scrapedAt" >= ${since}
      GROUP BY DATE("scrapedAt")
      ORDER BY date DESC
    `;

      const trendAnalysis = this.analyzeTrends(dailyTrends);

      return {
        period: `${days} days`,
        dailyBreakdown: dailyTrends,
        trends: trendAnalysis,
        insights: this.generateTrendInsights(trendAnalysis),
      };
    } catch (error) {
      logger.error("Error getting scraping trends", { error });
      throw error;
    }
  };

  private static calculateConsistencyScore = (sourceData: {
    source: string;
    count: number;
    avg_length: number;
    min_scraped_at: string;
    max_scraped_at: string;
  }): number => {
    const hoursSpan =
      sourceData.max_scraped_at && sourceData.min_scraped_at
        ? (new Date(sourceData.max_scraped_at).getTime() -
            new Date(sourceData.min_scraped_at).getTime()) /
          (1000 * 60 * 60)
        : 0;

    if (hoursSpan === 0) return 0;

    const expectedArticles = Math.floor(hoursSpan / 6);
    const actualArticles = sourceData.count;

    return Math.min(100, (actualArticles / expectedArticles) * 100);
  };

  private static findPeakHour = (
    timeDistribution: Array<{
      hour: string;
      count: number;
      unique_sources: number;
    }>
  ): { hour: string | null; count: number } => {
    if (timeDistribution.length === 0) return { hour: null, count: 0 };

    return timeDistribution.reduce(
      (peak, current) => (current.count > peak.count ? current : peak),
      { hour: null as string | null, count: 0 }
    );
  };

  private static calculateTemporalConsistency = (
    timeDistribution: Array<{
      hour: string;
      count: number;
      unique_sources: number;
    }>
  ): number => {
    if (timeDistribution.length < 2) return 0;

    const counts = timeDistribution.map((t) => t.count);
    const avg = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const variance =
      counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) /
      counts.length;

    return Math.max(0, 100 - (variance / avg) * 10);
  };

  private static calculateSourceHealth = (
    recent24h: number,
    recent7d: number,
    daysSinceLastScrape: number | null
  ): { score: number; status: string; issues: string[] } => {
    let score = 100;
    let status = "healthy";
    const issues: string[] = [];

    if (recent24h === 0) {
      score -= 30;
      issues.push("No articles in last 24 hours");
    }

    if (recent7d < 5) {
      score -= 20;
      issues.push("Low activity in last 7 days");
    }

    if (daysSinceLastScrape === null) {
      score = 0;
      status = "critical";
      issues.push("Never successfully scraped");
    } else if (daysSinceLastScrape > 2) {
      score -= 40;
      issues.push(`${daysSinceLastScrape} days since last scrape`);
    }

    if (score >= 80) status = "healthy";
    else if (score >= 50) status = "warning";
    else status = "critical";

    return { score: Math.max(0, score), status, issues };
  };

  private static analyzeTrends = (
    dailyData: Array<{
      date: string;
      total_articles: number;
      active_sources: number;
      avg_content_length: number;
      categories_count: number;
    }>
  ): {
    direction: string;
    percentChange?: number;
    recentAverage?: number;
    historicalAverage?: number;
  } => {
    if (dailyData.length < 2) return { direction: "insufficient_data" };

    const recent = dailyData.slice(0, 3);
    const older = dailyData.slice(-3);

    const recentAvg =
      recent.reduce((sum, day) => sum + day.total_articles, 0) / recent.length;
    const olderAvg =
      older.reduce((sum, day) => sum + day.total_articles, 0) / older.length;

    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;

    return {
      direction:
        percentChange > 5
          ? "increasing"
          : percentChange < -5
          ? "decreasing"
          : "stable",
      percentChange: Math.round(percentChange * 100) / 100,
      recentAverage: Math.round(recentAvg),
      historicalAverage: Math.round(olderAvg),
    };
  };

  private static generateTrendInsights = (trendAnalysis: {
    direction: string;
    percentChange?: number;
    recentAverage?: number;
    historicalAverage?: number;
  }): string[] => {
    const insights: string[] = [];

    if (
      trendAnalysis.direction === "increasing" &&
      trendAnalysis.percentChange
    ) {
      insights.push(
        `Article volume is trending upward by ${trendAnalysis.percentChange}%`
      );
    } else if (
      trendAnalysis.direction === "decreasing" &&
      trendAnalysis.percentChange
    ) {
      insights.push(
        `Article volume is declining by ${Math.abs(
          trendAnalysis.percentChange
        )}%`
      );
    } else {
      insights.push("Article volume is stable");
    }

    return insights;
  };
}
