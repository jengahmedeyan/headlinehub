import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError } from '../../_lib/api-helpers';
import { logger } from '../../../src/utils/logger';
import headlineHubBot from '../../../src/bot';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    logger.info("🛑 Telegram bot stop triggered via API");
    
    const bot = headlineHubBot.getBot();
    
    if (!bot.isPolling()) {
      sendApiResponse(res, {
        status: 'info',
        message: 'Telegram bot is not running',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Stop polling
    await bot.stopPolling();
    
    sendApiResponse(res, {
      status: 'success',
      message: 'Telegram bot stopped successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['POST']);