import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError } from '../_lib/api-helpers';
import { logger } from '../../src/utils/logger';
import { RssScraperService } from '../../src/services/rss-scraper.service';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Verify that this is a cron request (optional security measure)
    const authHeader = req.headers.authorization;
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    logger.info("📡 Cron job triggered RSS scraping");
    
    // Run scraping in background and return immediately
    const startTime = new Date();
    RssScraperService.scrapeAndSaveAllRssNews()
      .then(() => {
        const duration = new Date().getTime() - startTime.getTime();
        logger.info(`✅ Cron RSS scraping completed in ${duration}ms`);
      })
      .catch((error) => {
        logger.error("❌ Cron RSS scraping failed:", error);
      });

    sendApiResponse(res, {
      status: 'success',
      message: 'RSS scraping initiated by cron',
      timestamp: startTime.toISOString(),
      note: 'Scraping is running in the background'
    });
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['POST', 'GET']);