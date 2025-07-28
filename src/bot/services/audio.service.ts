import TelegramBot from "node-telegram-bot-api";
import { ElevenLabsService } from "../../services/eleven-labs.service";
import { NewsService } from "../../services/news.service";

export class AudioService {
  private elevenLabsService: ElevenLabsService;
  private newsService: NewsService;

  constructor(private bot: TelegramBot) {
    this.elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY!);
    this.newsService = new NewsService();
  }

  public async handleAudioGeneration(chatId: number, data: string): Promise<void> {
    const articleId = data.replace("audio_", "");

    try {
      const generatingMsg = await this.bot.sendMessage(
        chatId,
        "🎧 Generating audio... This may take a moment."
      );

      const res = await this.newsService.getArticleById(articleId);

      if (!res.success || res.data.length === 0) {
        await this.bot.editMessageText("❌ Article not found.", {
          chat_id: chatId,
          message_id: generatingMsg.message_id,
        });
        return;
      }

      const article = res.data[0];
      const audioContent = this.prepareAudioContent(article);
      const audioBuffer = await this.elevenLabsService.textToSpeech(audioContent);

      await this.bot.deleteMessage(chatId, generatingMsg.message_id);

      await this.bot.sendAudio(chatId, audioBuffer, {
        caption: `🎧 Audio version: ${this.truncate(article.title, 100)}`,
        title: article.title,
        performer: article.source || "HeadlineHub",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📰 Back to Article",
                callback_data: `article_${article.id}`,
              },
              {
                text: "↩️ Back to List",
                callback_data: "back_to_list",
              },
            ],
          ],
        },
      });
    } catch (error) {
      console.error("Error generating audio:", error);
      await this.bot.sendMessage(
        chatId,
        "❌ Error generating audio. Please try again later."
      );
    }
  }

  private prepareAudioContent(article: any): string {
    const title = article.title || "Untitled Article";
    const content = article.content || article.description || "No content available";
    
    const cleanContent = content
      .replace(/&[a-zA-Z0-9#]+;/g, " ")
      .replace(/[^\w\s.,!?;:-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return `${title}. ${cleanContent}`;
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  }
}