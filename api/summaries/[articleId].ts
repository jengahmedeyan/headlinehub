import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError, sendApiError } from '../_lib/api-helpers';
import { SummaryService } from '../../src/services/summary.service';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const summaryService = new SummaryService();
    const { articleId } = req.query;

    if (!articleId) {
      sendApiError(res, "Article ID is required", 400);
      return;
    }

    if (req.method === 'GET') {
      const summary = await summaryService.getSummaryByArticleId(articleId as string);

      if (!summary) {
        sendApiError(res, "No summary found for this article", 404);
        return;
      }

      sendApiResponse(res, {
        summary: {
          id: summary.id,
          articleId: summary.articleId,
          summary: summary.summary,
          title: summary.title,
          createdAt: summary.createdAt,
          updatedAt: summary.updatedAt,
        },
      });
    } else if (req.method === 'DELETE') {
      const deleted = await summaryService.deleteSummary(articleId as string);

      if (!deleted) {
        sendApiError(res, "Failed to delete summary", 500);
        return;
      }

      sendApiResponse(res, {
        message: "Summary deleted successfully",
      });
    }
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['GET', 'DELETE']);