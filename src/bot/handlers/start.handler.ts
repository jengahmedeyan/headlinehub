import TelegramBot from "node-telegram-bot-api";

export class StartHandler {
  constructor(private bot: TelegramBot) {}

  public async handle(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const welcomeMessage = `
🎉 <b>Welcome to HeadlineHub Bot!</b>

Your personal news companion is ready to serve you the latest headlines.

Use /help to explore all available commands and start your news journey!
    `.trim();

    await this.bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: "HTML",
    });
  }
}
