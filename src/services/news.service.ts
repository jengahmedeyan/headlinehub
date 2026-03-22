import { ScraperService } from "./scraper.service";
import { HealthMonitoringService } from "./health-monitoring.service";
import { NewsResponse, PaginationMeta } from "../models/article.model";
import { logger } from "../utils/logger";
import { subDays } from "date-fns";
import prisma from "../utils/prisma";

export class NewsService {
  private scraperService: ScraperService;

  constructor() {
    this.scraperService = new ScraperService();
  }

  getAllNews = async (
    dateParam?: string,
    page: number = 1,
    limit: number = 20,
    source?: string,
    category?: string,
    q?: string
  ): Promise<NewsResponse> => {
    try {
      // Resolve the date param to a UTC day range on the scrapedAt DateTime column,
      // which is consistent across both scrapers (unlike the raw `date` string field).
      let dateRange: { gte: Date; lt: Date } | undefined;

      if (dateParam) {
        let targetDate: Date;
        const lower = dateParam.toLowerCase();
        if (lower === "today") {
          targetDate = new Date();
        } else if (lower === "yesterday") {
          targetDate = subDays(new Date(), 1);
        } else {
          // Accept YYYY-MM-DD or any string parseable by Date
          targetDate = new Date(dateParam);
        }

        if (!isNaN(targetDate.getTime())) {
          const start = new Date(targetDate);
          start.setUTCHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setUTCDate(end.getUTCDate() + 1);
          dateRange = { gte: start, lt: end };
        } else {
          logger.warn(`Invalid date param ignored: ${dateParam}`);
        }
      }

      // Build AND conditions so q's OR clause doesn't escape the other filters
      const andConditions: any[] = [];
      if (dateRange) {
        andConditions.push({ scrapedAt: dateRange });
      }
      if (source) {
        andConditions.push({ source: { contains: source, mode: "insensitive" } });
      }
      if (category) {
        andConditions.push({ category: { contains: category, mode: "insensitive" } });
      }
      if (q) {
        andConditions.push({
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        });
      }
      const where: any = andConditions.length ? { AND: andConditions } : {};

      const skip = (page - 1) * limit;

      const [totalCount, articlesFromDb, sourceGroups] = await Promise.all([
        prisma.article.count({ where }),
        prisma.article.findMany({
          where,
          orderBy: { scrapedAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.article.groupBy({
          by: ["source"],
          where,
          orderBy: { source: "asc" },
        }),
      ]);

      const articles = articlesFromDb.map((a: any) => ({
        ...a,
        hash: a.hash ?? undefined,
      }));

      const sources: string[] = sourceGroups.map((g: any) => g.source);

      const totalPages = Math.ceil(totalCount / limit);
      const pagination: PaginationMeta = {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return {
        success: true,
        data: articles,
        count: articles.length,
        sources,
        scrapedAt: new Date(),
        duplicatesRemoved: 0,
        healthStatus: HealthMonitoringService.getHealthStatus() as any,
        pagination,
        appliedFilters: {
          ...(dateRange && { date: dateParam }),
          ...(source && { source }),
          ...(category && { category }),
          ...(q && { q }),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error in getAllNews:", { error: errorMessage });
      return {
        success: false,
        data: [],
        count: 0,
        sources: [],
        scrapedAt: new Date(),
        error: errorMessage,
        duplicatesRemoved: 0,
        healthStatus: HealthMonitoringService.getHealthStatus() as any,
      };
    }
  };

  getArticleById = async (id: string): Promise<NewsResponse> => {
    try {
      const article = await prisma.article.findUnique({
        where: { id },
      });

      if (!article) {
        return {
          success: false,
          data: [],
          count: 0,
          sources: [],
          scrapedAt: new Date(),
          error: "Article not found",
          duplicatesRemoved: 0,
          healthStatus: HealthMonitoringService.getHealthStatus() as any,
        };
      }

      return {
        success: true,
        data: [{ ...article, hash: article.hash ?? undefined }],
        count: 1,
        sources: [article.source],
        scrapedAt: new Date(),
        duplicatesRemoved: 0,
        healthStatus: HealthMonitoringService.getHealthStatus() as any,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error in getArticleById:", { error: errorMessage });
      return {
        success: false,
        data: [],
        count: 0,
        sources: [],
        scrapedAt: new Date(),
        error: errorMessage,
        duplicatesRemoved: 0,
        healthStatus: HealthMonitoringService.getHealthStatus() as any,
      };
    }
  };

  getLatestArticles = async (): Promise<NewsResponse> => {
    try {
      const articlesFromDb = await prisma.article.findMany({
        orderBy: { scrapedAt: "desc" },
        take: 10,
      });
      const articles = articlesFromDb.map((a: any) => ({
        ...a,
      }));

      return {
        success: true,
        data: articles,
        count: articles.length,
        sources: Array.from(new Set(articles.map((a: any) => a.source).filter((source: any): source is string => typeof source === 'string'))),
        scrapedAt: new Date(),
        duplicatesRemoved: 0,
        healthStatus: HealthMonitoringService.getHealthStatus() as any,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error in getLatestArticles:", { error: errorMessage });
      return {
        success: false,
        data: [],
        count: 0,
        sources: [],
        scrapedAt: new Date(),
        error: errorMessage,
        duplicatesRemoved: 0,
        healthStatus: HealthMonitoringService.getHealthStatus() as any,
      };
    }
  };

  getNewsBySource = async (sourceName: string): Promise<NewsResponse> => {
    try {
      const articlesFromDb = await prisma.article.findMany({
        where: { source: sourceName },
        orderBy: { scrapedAt: "desc" },
      });
      const articles = articlesFromDb.map((a: any) => ({
        ...a,
        hash: a.hash ?? undefined,
      }));
      return {
        success: true,
        data: articles,
        count: articles.length,
        sources: [sourceName],
        scrapedAt: new Date(),
        duplicatesRemoved: 0,
        healthStatus: [
          HealthMonitoringService.getHealthStatus(sourceName),
        ] as any,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(`Error getting news by source ${sourceName}:`, {
        error: errorMessage,
      });
      return {
        success: false,
        data: [],
        count: 0,
        sources: [],
        scrapedAt: new Date(),
        error: errorMessage,
        duplicatesRemoved: 0,
        healthStatus: [
          HealthMonitoringService.getHealthStatus(sourceName),
        ] as any,
      };
    }
  };

  searchNews = async (query: string): Promise<NewsResponse> => {
    try {
      const articlesFromDb = await prisma.article.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
        },
        orderBy: { scrapedAt: "desc" },
      });
      const articles = articlesFromDb.map((a: any) => ({
        ...a,
        hash: a.hash ?? undefined,
      }));
      return {
        success: true,
        data: articles,
        count: articles.length,
        sources: Array.from(new Set(articles.map((a: any) => a.source).filter((source: any): source is string => typeof source === 'string'))),
        scrapedAt: new Date(),
        duplicatesRemoved: 0,
        healthStatus: HealthMonitoringService.getHealthStatus() as any,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error in searchNews:", { error: errorMessage });
      return {
        success: false,
        data: [],
        count: 0,
        sources: [],
        scrapedAt: new Date(),
        error: errorMessage,
        duplicatesRemoved: 0,
        healthStatus: HealthMonitoringService.getHealthStatus() as any,
      };
    }
  };

  getStats = async (): Promise<{
    articles: number;
    sources: number;
    lastScrape: Date | null;
  }> => {
    try {
      const articlesCount = await prisma.article.count();
      const sources = await prisma.article.findMany({
        select: { source: true },
      });
      const uniqueSources = [...new Set(sources.map((s: any) => s.source as string))];
      const lastArticle = await prisma.article.findFirst({
        orderBy: { scrapedAt: "desc" },
      });
      return {
        articles: articlesCount,
        sources: uniqueSources.length,
        lastScrape: lastArticle?.scrapedAt ?? null,
      };
    } catch (error) {
      logger.error("Error in getStats:", error);
      return { articles: 0, sources: 0, lastScrape: null };
    }
  };

  getHealthStatus = async (): Promise<{ success: boolean; data: any }> => {
    try {
      const allStatuses = HealthMonitoringService.getHealthStatus() as any;
      const overallHealth = HealthMonitoringService.getOverallHealth();

      return {
        success: true,
        data: {
          overall: overallHealth,
          sources: allStatuses,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error getting health status:", { error: errorMessage });

      return {
        success: false,
        data: { error: errorMessage },
      };
    }
  };
  
  getAvailableCategories = async (): Promise<string[]> => {
    try {
      const categories = await prisma.$queryRaw<Array<{ category: string }>>`
      SELECT DISTINCT LOWER("category") as category
      FROM "Article"
      WHERE "category" <> ''
      ORDER BY LOWER("category") ASC
    `;

      const categoryNames = categories
        .map((c: any) => c.category.charAt(0).toUpperCase() + c.category.slice(1))
        .filter(Boolean);

      logger.info(`Retrieved ${categoryNames.length} available categories`);
      return categoryNames;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error in getAvailableCategories:", { error: errorMessage });
      return ["General"];
    }
  };
}
