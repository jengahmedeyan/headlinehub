import TelegramBot from "node-telegram-bot-api";
import {
  scrapeAndSaveAllNews,
  ScraperService,
} from "../../services/scraper.service";

export class fetchService {
  private scraperService: ScraperService;

  constructor(private bot: TelegramBot) {
    this.scraperService = new ScraperService();
  }

  public async fetchArticles(chatId: number): Promise<void> {
    try {
      await scrapeAndSaveAllNews();
      await this.bot.sendMessage(chatId, "📰 Articles fetched successfully!");
    } catch (error) {
      await this.bot.sendMessage(chatId, "failed to fetch articles");
    }
  }
}
