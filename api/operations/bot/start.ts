import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError } from '../../_lib/api-helpers';
import { logger } from '../../../src/utils/logger';
import headlineHubBot from '../../../src/bot';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    logger.info("🤖 Telegram bot start triggered via API");
    
    // Get the bot instance
    const bot = headlineHubBot.getBot();
    
    // Check if bot is already polling
    if (bot.isPolling()) {
      sendApiResponse(res, {
        status: 'info',
        message: 'Telegram bot is already running',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Start polling
    await bot.startPolling();
    
    sendApiResponse(res, {
      status: 'success',
      message: 'Telegram bot started successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['POST']);