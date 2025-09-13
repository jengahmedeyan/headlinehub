import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError, sendApiError } from '../_lib/api-helpers';
import { SummaryService } from '../../src/services/summary.service';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const summaryService = new SummaryService();
    const { articleIds } = req.body;

    if (!articleIds || !Array.isArray(articleIds)) {
      sendApiError(res, "Article IDs array is required", 400);
      return;
    }

    const summaries = await summaryService.getBulkSummaries(articleIds);

    sendApiResponse(res, {
      summaries,
    });
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['POST']);