import TelegramBot from "node-telegram-bot-api";
import { ArticleListService } from "../services/articleList.service";
import { ArticleService } from "../services/article.service";
import { AudioService } from "../services/audio.service";

export class CallbackHandler {
  private articleService: ArticleService;
  private audioService: AudioService;
  private articleListService: ArticleListService;

  constructor(private bot: TelegramBot) {
    this.articleService = new ArticleService(bot);
    this.audioService = new AudioService(bot);
    this.articleListService = new ArticleListService(bot);
  }

  public async handle(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    const msg = callbackQuery.message;
    const chatId = msg?.chat.id;
    const data = callbackQuery.data;

    if (!chatId || !data) return;

    try {
      await this.bot.answerCallbackQuery(callbackQuery.id, {
        text: "Processing...",
        show_alert: false,
      });
    } catch (error: any) {
      console.warn("Callback query already expired:", error.message);
    }

    if (data.startsWith("article_")) {
      await this.articleService.handleArticleSelection(chatId, data);
    } else if (data.startsWith("audio_")) {
      await this.audioService.handleAudioGeneration(chatId, data);
    } else if (data === "back_to_list") {
      await this.articleListService.sendLatestArticlesList(chatId);
    }
  }
}