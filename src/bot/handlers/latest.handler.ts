import TelegramBot from "node-telegram-bot-api";
import { ArticleListService } from "../services/articleList.service";

export class LatestHandler {
  private articleListService: ArticleListService;

  constructor(private bot: TelegramBot) {
    this.articleListService = new ArticleListService(bot);
  }

  public async handle(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    await this.articleListService.sendLatestArticlesList(chatId);
  }
}