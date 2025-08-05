import TelegramBot from "node-telegram-bot-api";

export class HelpHandler {
  constructor(private bot: TelegramBot) {}

  public async handle(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    
    const helpMessage = `
📚 <b>HeadlineHub Bot Commands</b>

🚀 <b>/start</b> - Initialize the bot and get a welcome message
❓ <b>/help</b> - Display this help message
📰 <b>/latest</b> - Browse the latest news articles
📖 <b>/sources</b> - List all available news sources
🔍 <b>/source [source name]</b> - Get articles from a specific source

<i>Enjoy staying informed with HeadlineHub! 📱</i>
    `.trim();

    await this.bot.sendMessage(chatId, helpMessage, {
      parse_mode: "HTML"
    });
  }
}