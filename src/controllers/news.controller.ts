import { Request, Response } from 'express';
import { NewsService } from '../services/news.service';
import { logger } from '../utils/logger';

export class NewsController {
  private newsService: NewsService;

  constructor() {
    this.newsService = new NewsService();
  }

  getAllNews = async (req: Request, res: Response): Promise<void> => {
    try {
      const { date } = req.query;
      const result = await this.newsService.getAllNews(date as string | undefined);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      logger.error('Error in getAllNews controller:', error);
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
      logger.error('Error in getNewsBySource controller:', error);
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

  getAvailableSources = async (req: Request, res: Response): Promise<void> => {
    try {
      const { newsSources } = await import('../config/news-sources');
      const sources = Object.values(newsSources).map(source => ({
        name: source.name,
        url: source.url,
      }));

      res.json({
        success: true,
        sources,
        count: sources.length,
      });
    } catch (error) {
      logger.error('Error in getAvailableSources controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
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
      logger.error('Error in getHealthStatus controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
