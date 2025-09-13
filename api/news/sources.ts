import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError } from '../_lib/api-helpers';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { rssNewsSources } = await import('../../src/config/rss-news-sources');
    const sources = Object.values(rssNewsSources).map((source) => ({
      name: source.name,
      url: source.url,
    }));

    sendApiResponse(res, {
      sources,
      count: sources.length,
    });
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['GET']);