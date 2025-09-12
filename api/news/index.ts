import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError } from '../_lib/api-helpers';
import { NewsService } from '../../src/services/news.service';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const newsService = new NewsService();
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

    const result = await newsService.getAllNews(
      date as string | undefined,
      pageNum,
      limitNum
    );

    if (result.success) {
      sendApiResponse(res, result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['GET']);