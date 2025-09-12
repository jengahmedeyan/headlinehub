import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError } from '../../_lib/api-helpers';
import headlineHubBot from '../../../src/bot';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const bot = headlineHubBot.getBot();
    const isRunning = bot.isPolling();
    
    sendApiResponse(res, {
      isRunning,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['GET']);