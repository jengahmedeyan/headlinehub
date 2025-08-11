import TelegramBot from "node-telegram-bot-api";
import { ArticleService } from "../services/article.service";
import { rssNewsSources } from "../../config/rss-news-sources";

export class SourceHandler {
  private articleService: ArticleService;

  constructor(private bot: TelegramBot) {
    this.articleService = new ArticleService(bot);
  }

  public async handle(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text?.toLowerCase();

    if (!text) return;

    if (text === '/sources') {
      await this.showAvailableSources(chatId);
      return;
    }

    if (text.startsWith('/source ')) {
      const sourceName = text.replace('/source ', '').trim();
      await this.handleSourceRequest(chatId, sourceName);
      return;
    }

    const matchedSource = this.findSourceByName(text);
    if (matchedSource) {
      await this.articleService.getArticlesBySource(chatId, matchedSource.name);
      return;
    }
  }

  private async showAvailableSources(chatId: number): Promise<void> {
    const keyboard = {
      inline_keyboard: rssNewsSources.map((source) => [
        {
          text: `📰 ${source.name}`,
          callback_data: `source_${source.name}`,
        },
      ]),
    };

    await this.bot.sendMessage(
      chatId,
      `📰 <b>Available News Sources</b>\n\nSelect a source to browse articles or use <code>/source [source name]</code>`,
      {
        parse_mode: "HTML",
        reply_markup: keyboard,
      }
    );
  }

  private async handleSourceRequest(chatId: number, sourceName: string): Promise<void> {
    const source = this.findSourceByName(sourceName);
    
    if (!source) {
      await this.bot.sendMessage(
        chatId,
        `❌ Source "${sourceName}" not found.\n\nUse /sources to see available sources.`
      );
      return;
    }

    await this.articleService.getArticlesBySource(chatId, source.name);
  }

  private findSourceByName(name: string): typeof rssNewsSources[0] | null {
    const normalizedName = name.toLowerCase().trim();
    
    return rssNewsSources.find((source) => 
      source.name.toLowerCase() === normalizedName ||
      source.id.toLowerCase() === normalizedName ||
      source.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(source.name.toLowerCase())
    ) || null;
  }
}