import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError } from '../_lib/api-helpers';
import { logger } from '../../src/utils/logger';
import { RssScraperService } from '../../src/services/rss-scraper.service';
import headlineHubBot from '../../src/bot';

async function handler(req: VercelRequest, res: VercelResponse) {
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

    sendApiResponse(res, {
      status: 'success',
      message: 'Services startup initiated',
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['POST']);