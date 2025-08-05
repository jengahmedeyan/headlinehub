import TelegramBot from "node-telegram-bot-api";

export class StartHandler {
  constructor(private bot: TelegramBot) {}

  public async handle(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const welcomeMessage = `
🎉 <b>Welcome to HeadlineHub Bot!</b>
🤖 I am here to help you stay updated with the latest news articles from various sources in The Gambia.
Here are some commands you can use:
🚀 <b>/start</b> - Initialize the bot and get a welcome message
❓ <b>/help</b> - Display this help message
📰 <b>/latest</b> - Browse the latest news articles
📖 <b>/sources</b> - List all available news sources
🔍 <b>/source [source name]</b> - Get articles from a specific source

    `.trim();

    await this.bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: "HTML",
    });
  }
}
