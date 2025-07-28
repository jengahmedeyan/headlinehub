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

<b>How to use:</b>
1. Use /latest to see recent articles
2. Click on any article to read the summary
3. Generate audio versions for hands-free listening
4. Click links to read full articles on the source website

<i>Enjoy staying informed with HeadlineHub! 📱</i>
    `.trim();

    await this.bot.sendMessage(chatId, helpMessage, {
      parse_mode: "HTML"
    });
  }
}