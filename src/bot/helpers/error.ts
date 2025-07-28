import TelegramBot from "node-telegram-bot-api";
import { messages } from "../config";
import { logger } from "../../utils/logger";

export class ErrorHandler {
  constructor(private bot: TelegramBot) {}

  public async handleError(
    error: Error,
    chatId: number,
    context: string = "general"
  ): Promise<void> {
    console.error(`Error in ${context}:`, error);

    let errorMessage: string;

    switch (context) {
      case "article_fetch":
        errorMessage = messages.errors.articleNotFound;
        break;
      case "articles_list":
        errorMessage = messages.errors.fetchError;
        break;
      case "audio_generation":
        errorMessage = messages.errors.audioError;
        break;
      default:
        errorMessage = messages.errors.generalError;
    }

    try {
      await this.bot.sendMessage(chatId, errorMessage);
    } catch (sendError) {
      logger.error("Failed to send error message:", sendError);
    }
  }

  public static logError(error: Error, context: string): void {
    logger.error(`[${new Date().toISOString()}] Error in ${context}:`, {
      message: error.message,
      stack: error.stack,
    });
  }
}