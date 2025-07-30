import TelegramBot from "node-telegram-bot-api";
import { NewsService } from "../../services/news.service";
import { ArticleFormatter } from "../helpers/formatArticle";
import { logger } from "../../utils/logger";

export class ArticleService {
  private newsService: NewsService;
  private articleFormatter: ArticleFormatter;

  constructor(private bot: TelegramBot) {
    this.newsService = new NewsService();
    this.articleFormatter = new ArticleFormatter();
  }

  public async handleArticleSelection(chatId: number, data: string): Promise<void> {
    const articleId = data.replace("article_", "");

    try {
      const res = await this.newsService.getArticleById(articleId);

      if (!res.success || res.data.length === 0) {
        await this.bot.sendMessage(chatId, "❌ Article not found or could not be loaded.");
        return;
      }

      const article = res.data[0];
      const formattedContent = this.articleFormatter.formatForTelegram(article);

      await this.bot.sendMessage(chatId, formattedContent, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎧 Generate Audio",
                callback_data: `audio_${article.id}`,
              },
              {
                text: "🔗 Read Original",
                url: article.link,
              },
            ],
            [
              {
                text: "↩️ Back to List",
                callback_data: "back_to_list",
              },
            ],
          ],
        },
      });
    } catch (error) {
      console.error("Error fetching article:", error);
      logger.error("Error fetching article:", error);
      await this.bot.sendMessage(chatId, "❌ Error loading article content.");
    }
  }
}