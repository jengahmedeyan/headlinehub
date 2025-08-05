import TelegramBot from "node-telegram-bot-api";
import { StartHandler } from "./start.handler";
import { HelpHandler } from "./help.handler";
import { LatestHandler } from "./latest.handler";
import { CallbackHandler } from "./callback.handler";
import { FetchHandler } from "./fetch.handler";
import { SourceHandler } from "./source.handler";

export class BotHandlers {
  private startHandler: StartHandler;
  private helpHandler: HelpHandler;
  private latestHandler: LatestHandler;
  private callbackHandler: CallbackHandler;
  private fetchHandler: FetchHandler;
  private sourceHandler: SourceHandler;

  constructor(private bot: TelegramBot) {
    this.startHandler = new StartHandler(bot);
    this.helpHandler = new HelpHandler(bot);
    this.latestHandler = new LatestHandler(bot);
    this.callbackHandler = new CallbackHandler(bot);
    this.fetchHandler = new FetchHandler(bot);
    this.sourceHandler = new SourceHandler(bot);
  }

  public async handleStart(msg: TelegramBot.Message): Promise<void> {
    await this.startHandler.handle(msg);
  }

  public async handleHelp(msg: TelegramBot.Message): Promise<void> {
    await this.helpHandler.handle(msg);
  }

  public async handleLatest(msg: TelegramBot.Message): Promise<void> {
    await this.latestHandler.handle(msg);
  }

  public async handleCallback(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    await this.callbackHandler.handle(callbackQuery);
  }

  public async handleFetch(msg: TelegramBot.Message): Promise<void> {
    await this.fetchHandler.handle(msg);
  }

  public async handleSources(msg: TelegramBot.Message): Promise<void> {
    await this.sourceHandler.handle(msg);
  }
}