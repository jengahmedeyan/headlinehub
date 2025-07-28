import TelegramBot from "node-telegram-bot-api";
import { NewsService } from "../../services/news.service";

export class ArticleListService {
  private newsService: NewsService;

  constructor(private bot: TelegramBot) {
    this.newsService = new NewsService();
  }

  public async sendLatestArticlesList(chatId: number): Promise<void> {
    try {
      const res = await this.newsService.getLatestArticles();
      const articles = res.data;

      if (!articles || articles.length === 0) {
        await this.bot.sendMessage(chatId, "📰 No articles found at the moment. Please try again later.");
        return;
      }

      const keyboard = {
        inline_keyboard: articles.slice(0, 10).map((article) => [
          {
            text: `📰 ${this.truncateTitle(article.title)}`,
            callback_data: `article_${article.id}`,
          },
        ]),
      };

      await this.bot.sendMessage(
        chatId,
        "📰 <b>Latest News Articles</b>\n\nSelect an article to read:",
        {
          parse_mode: "HTML",
          reply_markup: keyboard,
        }
      );
    } catch (error) {
      console.error("Error fetching latest articles:", error);
      await this.bot.sendMessage(
        chatId, 
        "❌ Error fetching latest articles. Please try again later."
      );
    }
  }

  private truncateTitle(title: string, maxLength: number = 65): string {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + "...";
  }
}