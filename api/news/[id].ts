import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError } from '../_lib/api-helpers';
import { NewsService } from '../../src/services/news.service';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const newsService = new NewsService();
    const { id } = req.query;
    
    const result = await newsService.getArticleById(id as string);

    if (result.success) {
      sendApiResponse(res, result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['GET']);