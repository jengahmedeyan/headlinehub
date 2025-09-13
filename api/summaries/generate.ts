import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError, sendApiError } from '../_lib/api-helpers';
import { SummaryService } from '../../src/services/summary.service';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const summaryService = new SummaryService();
    const { articleId, content, title } = req.body;

    if (!articleId || !content || !title) {
      sendApiError(res, "Article ID, content, and title are required", 400);
      return;
    }

    const existingSummary = await summaryService.getSummaryByArticleId(articleId);
    if (existingSummary) {
      sendApiResponse(res, {
        summary: existingSummary.summary,
        cached: true,
      });
      return;
    }

    const summary = await summaryService.generateAndSaveSummary(
      articleId,
      content,
      title
    );

    sendApiResponse(res, {
      summary: summary.summary,
      cached: false,
    });
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['POST']);