import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError } from '../_lib/api-helpers';
import { RssScraperService } from '../../src/services/rss-scraper.service';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const sourceKey = req.query.source as string;
    let sourcesToScrape;
    
    if (sourceKey) {
      const { rssNewsSources } = await import('../../src/config/rss-news-sources');
      const source = rssNewsSources.find((s: any) => s.name === sourceKey);
      if (!source) {
        res.status(400).json({ success: false, error: `Unknown RSS source: ${sourceKey}` });
        return;
      }
      sourcesToScrape = [source];
    } else {
      const { rssNewsSources } = await import('../../src/config/rss-news-sources');
      sourcesToScrape = rssNewsSources;
    }
    
    const result = await RssScraperService.scrapeAndSaveAllRssNews({
      batchSize: sourcesToScrape.length,
      dryRun: true
    });
    
    sendApiResponse(res, result);
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['GET']);