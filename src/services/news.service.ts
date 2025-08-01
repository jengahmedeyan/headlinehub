import { ScraperService } from "./scraper.service";
import { HealthMonitoringService } from "./health-monitoring.service";
import { NewsResponse, PaginationMeta } from "../models/article.model";
import { logger } from "../utils/logger";
import { format, subDays } from "date-fns";
import prisma from "../utils/prisma";

export class NewsService {
  private scraperService: ScraperService;

  constructor() {
    this.scraperService = new ScraperService();
  }

  async getAllNews(
    dateParam?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<NewsResponse> {
    try {
      const ARTICLE_DATE_FORMAT = "MMMM d, yyyy";
      let targetDateString: string | undefined = undefined;

      if (dateParam) {
        if (dateParam.toLowerCase() === "today") {
          targetDateString = format(new Date(), ARTICLE_DATE_FORMAT);
        } else if (dateParam.toLowerCase() === "yesterday") {
          targetDateString = format(
            subDays(new Date(), 1),
            ARTICLE_DATE_FORMAT
          );
        } else {
          targetDateString = dateParam;
        }
      }

      const where: any = {};
      if (targetDateString) {
        where.date = targetDateString;
      }

      const skip = (page - 1) * limit;

      const totalCount = await prisma.article.count({ where });

      const articlesFromDb = await prisma.article.findMany({
        where,
        orderBy: { scrapedAt: "desc" },
        skip,
        take: limit,
      });

      const articles = articlesFromDb.map((a) => ({
        ...a,
        hash: a.hash ?? undefined,
      }));

      // TODO: optimize this for large datasets
      const allArticlesForSources = await prisma.article.findMany({
        where,
        select: { source: true },
      });
      const sources = [...new Set(allArticlesForSources.map((a) => a.source))];

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
  }

  async getArticleById(id: string): Promise<NewsResponse> {
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
  }

  async getLatestArticles(): Promise<NewsResponse> {
    try {
      const articlesFromDb = await prisma.article.findMany({
        orderBy: { scrapedAt: "desc" },
        take: 10,
      });
      const articles = articlesFromDb.map((a) => ({
        ...a,
        hash: a.hash ?? undefined,
      }));

      return {
        success: true,
        data: articles,
        count: articles.length,
        sources: [...new Set(articles.map((a) => a.source))],
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
  }

  async getNewsBySource(sourceName: string): Promise<NewsResponse> {
    try {
      const articlesFromDb = await prisma.article.findMany({
        where: { source: sourceName },
        orderBy: { scrapedAt: "desc" },
      });
      const articles = articlesFromDb.map((a) => ({
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
  }

  async searchNews(query: string): Promise<NewsResponse> {
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
      const articles = articlesFromDb.map((a) => ({
        ...a,
        hash: a.hash ?? undefined,
      }));
      return {
        success: true,
        data: articles,
        count: articles.length,
        sources: [...new Set(articles.map((a) => a.source))],
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
  }

  async getStats(): Promise<{
    articles: number;
    sources: number;
    lastScrape: Date | null;
  }> {
    try {
      const articlesCount = await prisma.article.count();
      const sources = await prisma.article.findMany({
        select: { source: true },
      });
      const uniqueSources = [...new Set(sources.map((s) => s.source))];
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
  }

  async getHealthStatus(): Promise<{ success: boolean; data: any }> {
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
  }
  async getAvailableCategories(): Promise<string[]> {
    try {
      const categories = await prisma.article.findMany({
        select: { category: true },
        distinct: ["category"],
        where: {
          category: {
            not: "",
          },
        },
        orderBy: { category: "asc" },
      });

      const categoryNames = categories.map((c) => c.category).filter(Boolean);

      logger.info(`Retrieved ${categoryNames.length} available categories`);
      return categoryNames;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error in getAvailableCategories:", { error: errorMessage });
      return ["General"];
    }
  }
}
