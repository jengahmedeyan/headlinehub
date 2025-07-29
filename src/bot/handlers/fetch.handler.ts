import TelegramBot from "node-telegram-bot-api";
import { fetchService } from "../services/fetch.service";

export class FetchHandler {
    private fetchService: fetchService;
    private adminIds: number[];

    constructor(private bot: TelegramBot) {
        this.fetchService = new fetchService(bot);
        
        const adminIdsString = process.env.TELEGRAM_ADMIN_IDS || "";
        this.adminIds = adminIdsString
            .split(",")
            .map(id => parseInt(id.trim()))
            .filter(id => !isNaN(id));
        
        if (this.adminIds.length === 0) {
            console.warn("No admin IDs configured. Set TELEGRAM_ADMIN_IDS environment variable.");
        }
    }

    public async handle(msg: TelegramBot.Message): Promise<void> {
        const chatId = msg.chat.id;
        const userId = msg.from?.id;

        if (!this.isAdmin(userId)) {
            await this.bot.sendMessage(chatId, "❌ Access denied. This command is restricted to administrators only.");
            return;
        }

        try {
            await this.bot.sendMessage(chatId, "🔄 Starting article fetch... This may take a few moments.");
            await this.fetchService.fetchArticles(chatId);
        } catch (error) {
            console.error("Error in fetch handler:", error);
            await this.bot.sendMessage(chatId, "❌ An error occurred while fetching articles. Please try again later.");
        }
    }

    private isAdmin(userId: number | undefined): boolean {
        if (!userId) return false;
        return this.adminIds.includes(userId);
    }
}