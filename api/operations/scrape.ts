import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError } from '../_lib/api-helpers';
import { logger } from '../../src/utils/logger';
import { RssScraperService } from '../../src/services/rss-scraper.service';

async function handler(req: VercelRequest, res: VercelResponse) {
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

    sendApiResponse(res, {
      status: 'success',
      message: 'RSS scraping initiated',
      timestamp: startTime.toISOString(),
      note: 'Scraping is running in the background'
    });
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['POST']);