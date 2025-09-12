import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError, sendApiError } from '../_lib/api-helpers';
import { SummaryService } from '../../src/services/summary.service';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const summaryService = new SummaryService();
    
    if (req.method === 'POST') {
      const { articleId, summary, title } = req.body;

      if (!articleId || !summary) {
        sendApiError(res, "Article ID and summary are required", 400);
        return;
      }

      const newSummary = await summaryService.createSummary(
        articleId,
        summary,
        title
      );

      sendApiResponse(res, {
        summary: {
          id: newSummary.id,
          articleId: newSummary.articleId,
          summary: newSummary.summary,
          title: newSummary.title,
          createdAt: newSummary.createdAt,
          updatedAt: newSummary.updatedAt,
        },
      }, 201);
    }
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['POST']);