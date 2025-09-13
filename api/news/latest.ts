import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError } from '../_lib/api-helpers';
import { NewsService } from '../../src/services/news.service';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const newsService = new NewsService();
    const stats = await newsService.getLatestArticles();
    sendApiResponse(res, { stats });
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['GET']);