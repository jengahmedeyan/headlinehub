import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { RssScraperService } from '../services/rss-scraper.service';
import { AiScraperService } from '../services/ai-scraper.service';
import headlineHubBot from '../bot';

export class OperationsController {
  // Endpoint to trigger AI scraping manually (for testing)
  static triggerAiScraping = async (req: Request, res: Response) => {
    try {
      logger.info("🤖 Manual AI scraping triggered via API");

      const startTime = new Date();
      AiScraperService.scrapeAndSaveAllAiSources()
        .then((result) => {
          const duration = new Date().getTime() - startTime.getTime();
          logger.info(`✅ Manual AI scraping completed in ${duration}ms`, result);
        })
        .catch((error) => {
          logger.error("❌ Manual AI scraping failed:", error);
        });

      res.json({
        status: 'success',
        message: 'AI scraping initiated',
        timestamp: startTime.toISOString(),
        note: 'Scraping is running in the background',
      });
    } catch (error: any) {
      logger.error("Error triggering AI scraping:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to trigger AI scraping',
        error: error.message,
      });
    }
  };

  // Endpoint to trigger RSS scraping manually
  static triggerRssScraping = async (req: Request, res: Response) => {
    try {
      logger.info("📡 Manual RSS scraping triggered via API");
      
      // Run scraping in background and return immediately
      const startTime = new Date();
      RssScraperService.scrapeAndSaveAllRssNews()
        .then(() => {
          const duration = new Date().getTime() - startTime.getTime();
          logger.info(`✅ Manual RSS scraping completed in ${duration}ms`);
        })
        .catch((error) => {
          logger.error("❌ Manual RSS scraping failed:", error);
        });

      res.json({
        status: 'success',
        message: 'RSS scraping initiated',
        timestamp: startTime.toISOString(),
        note: 'Scraping is running in the background'
      });
    } catch (error: any) {
      logger.error("Error triggering RSS scraping:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to trigger RSS scraping',
        error: error.message
      });
    }
  };

  // Endpoint to start/restart the Telegram bot
  static startBot = async (req: Request, res: Response) => {
    try {
      logger.info("🤖 Telegram bot start triggered via API");
      
      // Get the bot instance
      const bot = headlineHubBot.getBot();
      
      // Check if bot is already polling
      if (bot.isPolling()) {
        return res.json({
          status: 'info',
          message: 'Telegram bot is already running',
          timestamp: new Date().toISOString()
        });
      }

      // Start polling
      await bot.startPolling();
      
      res.json({
        status: 'success',
        message: 'Telegram bot started successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error("Error starting Telegram bot:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to start Telegram bot',
        error: error.message
      });
    }
  };

  // Endpoint to stop the Telegram bot
  static stopBot = async (req: Request, res: Response) => {
    try {
      logger.info("🛑 Telegram bot stop triggered via API");
      
      const bot = headlineHubBot.getBot();
      
      if (!bot.isPolling()) {
        return res.json({
          status: 'info',
          message: 'Telegram bot is not running',
          timestamp: new Date().toISOString()
        });
      }

      // Stop polling
      await bot.stopPolling();
      
      res.json({
        status: 'success',
        message: 'Telegram bot stopped successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error("Error stopping Telegram bot:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to stop Telegram bot',
        error: error.message
      });
    }
  };

  // Endpoint to get bot status
  static getBotStatus = async (req: Request, res: Response) => {
    try {
      const bot = headlineHubBot.getBot();
      const isRunning = bot.isPolling();
      
      res.json({
        status: 'success',
        data: {
          isRunning,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      logger.error("Error getting bot status:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get bot status',
        error: error.message
      });
    }
  };

  // Combined endpoint to start both bot and trigger scraping
  static startAll = async (req: Request, res: Response) => {
    try {
      logger.info("🚀 Starting all services via API");
      
      const results = {
        bot: { status: 'pending', message: '' },
        scraping: { status: 'pending', message: '' }
      };

      // Start bot
      try {
        const bot = headlineHubBot.getBot();
        if (!bot.isPolling()) {
          await bot.startPolling();
          results.bot = { status: 'success', message: 'Bot started successfully' };
        } else {
          results.bot = { status: 'info', message: 'Bot was already running' };
        }
      } catch (error: any) {
        results.bot = { status: 'error', message: error.message };
      }

      // Trigger scraping
      try {
        RssScraperService.scrapeAndSaveAllRssNews()
          .then(() => logger.info("✅ Background scraping completed"))
          .catch((error) => logger.error("❌ Background scraping failed:", error));
        
        results.scraping = { status: 'success', message: 'Scraping initiated in background' };
      } catch (error: any) {
        results.scraping = { status: 'error', message: error.message };
      }

      res.json({
        status: 'success',
        message: 'Services startup initiated',
        results,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error("Error starting all services:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to start services',
        error: error.message
      });
    }
  };
}
