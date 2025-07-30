import { Request, Response } from "express";
import { NewsService } from "../services/news.service";
import { logger } from "../utils/logger";

export class NewsController {
  private newsService: NewsService;

  constructor() {
    this.newsService = new NewsService();
  }

  getAllNews = async (req: Request, res: Response): Promise<void> => {
    try {
      const { date, page, limit } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;

      if (pageNum < 1) {
        res.status(400).json({
          success: false,
          error: "Invalid page number",
          message: "Page number must be greater than 0",
          data: [],
          count: 0,
          sources: [],
          scrapedAt: new Date(),
          duplicatesRemoved: 0,
        });
        return;
      }

      if (limitNum < 1 || limitNum > 100) {
        res.status(400).json({
          success: false,
          error: "Invalid limit",
          message: "Limit must be between 1 and 100",
          data: [],
          count: 0,
          sources: [],
          scrapedAt: new Date(),
          duplicatesRemoved: 0,
        });
        return;
      }

      const result = await this.newsService.getAllNews(
        date as string | undefined,
        pageNum,
        limitNum
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      logger.error("Error in getAllNews controller:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
        sources: [],
        scrapedAt: new Date(),
        duplicatesRemoved: 0,
      });
    }
  };

  getArticleById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const result = await this.newsService.getArticleById(id);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      logger.error("Error in getArticleById controller:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
        sources: [],
        scrapedAt: new Date(),
        duplicatesRemoved: 0,
      });
    }
  };

  getLatestNewsArticles = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const stats = await this.newsService.getLatestArticles();
      res.json({ success: true, stats });
    } catch (error) {
      logger.error("Error in getLatestNewsController controller:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  };

  getNewsBySource = async (req: Request, res: Response): Promise<void> => {
    try {
      const { source } = req.params;
      const result = await this.newsService.getNewsBySource(source);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error("Error in getNewsBySource controller:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        data: [],
        count: 0,
        sources: [],
        scrapedAt: new Date(),
        duplicatesRemoved: 0,
      });
    }
  };

  getAvailableSources = async (req: Request, res: Response): Promise<void> => {
    try {
      const { rssNewsSources } = await import("../config/rss-news-sources");
      const sources = Object.values(rssNewsSources).map((source) => ({
        name: source.name,
        url: source.url,
      }));

      res.json({
        success: true,
        sources,
        count: sources.length,
      });
    } catch (error) {
      logger.error("Error in getAvailableSources controller:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  searchNews = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query } = req.query;
      const result = await this.newsService.searchNews(query as string);
      res.json(result);
    } catch (error) {
      logger.error("Error in searchNews controller:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  };

  getAvailableCategories = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const categories = await this.newsService.getAvailableCategories();
      res.json({ success: true, categories });
    } catch (error) {
      logger.error("Error in getAvailableCategories controller:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  };

  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.newsService.getStats();
      res.json({ success: true, stats });
    } catch (error) {
      logger.error("Error in getStats controller:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  };

  getHealthStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.newsService.getHealthStatus();

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      logger.error("Error in getHealthStatus controller:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}
