import TelegramBot from "node-telegram-bot-api";
import { BotHandlers } from "./handlers";
import { logger } from "../utils/logger";

export class HeadlineHubBot {
  private bot: TelegramBot;
  private handlers: BotHandlers;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN must be set in the environment");
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.handlers = new BotHandlers(this.bot);
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.bot.onText(/\/start/, this.handlers.handleStart.bind(this.handlers));
    this.bot.onText(/\/help/, this.handlers.handleHelp.bind(this.handlers));
    this.bot.onText(/\/latest/, this.handlers.handleLatest.bind(this.handlers));

    this.bot.on("callback_query", this.handlers.handleCallback.bind(this.handlers));

    this.bot.on("polling_error", (error) => {
      logger.error("Polling error:", error);
    });
  }

  public getBot(): TelegramBot {
    return this.bot;
  }

  public start(): void {
    console.log("🤖 HeadlineHub Bot is running...");
  }
}

export const headlineHubBot = new HeadlineHubBot();
export default headlineHubBot;