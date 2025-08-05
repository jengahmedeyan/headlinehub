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

  public async getArticlesBySource(chatId: number, source: string): Promise<void>{
    try {
      const res = await this.newsService.getNewsBySource(source);

      if (!res.success || res.data.length === 0) {
        await this.bot.sendMessage(chatId, `❌ No articles found for source: ${source}`);
        return;
      }

      const articles = res.data.slice(0, 10);
      const keyboard = {
        inline_keyboard: articles.map((article) => [
          {
            text: `📰 ${this.articleFormatter.truncateTitle(article.title)}`,
            callback_data: `article_${article.id}`,
          },
        ]),
      };

      await this.bot.sendMessage(
        chatId,
        `📰 <b>Articles from ${source}</b>\n\nSelect an article to read:`,
        {
          parse_mode: "HTML",
          reply_markup: keyboard,
        }
      );
    } catch (error) {
      console.error("Error fetching articles by source:", error);
      logger.error("Error fetching articles by source:", error);
      await this.bot.sendMessage(chatId, "❌ Error fetching articles. Please try again later.");
    }
  }

  public async handleSourceSelection(chatId: number, data: string): Promise<void> {
  const sourceId = data.replace("source_", "");
  await this.getArticlesBySource(chatId, sourceId);
}

}