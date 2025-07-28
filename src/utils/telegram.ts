import { ElevenLabsService } from "../services/eleven-labs.service";
import { NewsService } from "../services/news.service";
import TelegramBot from "node-telegram-bot-api";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN must be set in the environment");
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Welcome to the HeadlineHub Bot! Use /help to see available commands."
  );
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Available commands:\n/start - Start the bot\n/help - Show this help message"
  );
});

async function sendLatestArticlesList(chatId: number) {
  try {
    const newsService = new NewsService();
    const res = await newsService.getLatestArticles();
    const articles = res.data;

    if (!articles || articles.length === 0) {
      bot.sendMessage(chatId, "No articles found.");
      return;
    }

    const keyboard = {
      inline_keyboard: articles.slice(0, 10).map((article, index) => [
        {
          text: `📰 ${article.title.substring(0, 60)}${
            article.title.length > 60 ? "..." : ""
          }`,
          callback_data: `article_${article.id}`,
        },
      ]),
    };

    bot.sendMessage(
      chatId,
      "📰 <b>Latest News Articles</b>\n\nSelect an article to read:",
      {
        parse_mode: "HTML",
        reply_markup: keyboard,
      }
    );
  } catch (err) {
    console.error("Error fetching latest articles:", err);
    bot.sendMessage(chatId, "Error fetching latest articles.");
  }
}

bot.onText(/\/latest/, async (msg) => {
  const chatId = msg.chat.id;
  await sendLatestArticlesList(chatId);
});

const elevenLabsService = new ElevenLabsService(
  process.env.ELEVENLABS_API_KEY!
);

bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg?.chat.id;
  const data = callbackQuery.data;

  if (!chatId || !data) return;

  try {
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "Processing...",
      show_alert: false,
    });
  } catch (error: any) {
    console.warn("Callback query already expired:", error.message);
  }

  if (data.startsWith("article_")) {
    const articleId = data.replace("article_", "");

    try {
      const newsService = new NewsService();
      const res = await newsService.getArticleById(articleId);

      if (!res.success || res.data.length === 0) {
        bot.sendMessage(chatId, "❌ Article not found or could not be loaded.");
        return;
      }

      const article = res.data[0];
      const formattedContent = formatArticleForTelegram(article);

      bot.sendMessage(chatId, formattedContent, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎧 Generate Audio",
                callback_data: `audio_${article.id}`,
              },
              {
                text: "🔗 Read Full Article",
                url: article.link,
              },
            ],
            [
              {
                text: "↩️ Back to List",
                callback_data: "back_to_list",
              },
            ],
          ],
        },
      });
    } catch (error) {
      console.error("Error fetching article:", error);
      bot.sendMessage(chatId, "❌ Error loading article content.");
    }
  }

  if (data.startsWith("audio_")) {
    const articleId = data.replace("audio_", "");

    try {
      const generatingMsg = await bot.sendMessage(
        chatId,
        "🎧 Generating audio... This may take a moment."
      );

      const newsService = new NewsService();
      const res = await newsService.getArticleById(articleId);

      if (!res.success || res.data.length === 0) {
        await bot.editMessageText("❌ Article not found.", {
          chat_id: chatId,
          message_id: generatingMsg.message_id,
        });
        return;
      }

      const article = res.data[0];

      const audioContent = `${article.title}. ${article.content}`;

      const audioBuffer = await elevenLabsService.textToSpeech(audioContent);

      await bot.deleteMessage(chatId, generatingMsg.message_id);

      await bot.sendAudio(chatId, audioBuffer, {
        caption: `🎧 Audio version of: ${article.title}`,
        title: article.title,
        performer: article.source,
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
      bot.sendMessage(
        chatId,
        "❌ Error generating audio. Please try again later."
      );
    }
  }

  if (data === "back_to_list") {
    await sendLatestArticlesList(chatId);
  }
});

function formatArticleForTelegram(article: any): string {
  const maxLength = 4096;
  const title = article.title || "No Title";
  const content =
    article.content || article.description || "No content available";
  const source = article.source || "Unknown Source";
  const publishedAt = article.date
    ? new Date(article.date).toLocaleDateString()
    : "Unknown Date";

  let cleanContent = content
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();

  const header = `<b>${escapeHtml(title)}</b>\n\n`;
  const footer = `\n\n📅 <b>Published:</b> ${publishedAt}\n📰 <b>Source:</b> ${escapeHtml(
    source
  )}`;

  const availableLength = maxLength - header.length - footer.length - 100;

  if (cleanContent.length > availableLength) {
    const truncated = cleanContent.substring(0, availableLength);
    const lastParagraphEnd = truncated.lastIndexOf("\n\n");

    if (lastParagraphEnd > availableLength * 0.7) {
      cleanContent = truncated.substring(0, lastParagraphEnd) + "\n\n...";
    } else {
      cleanContent = truncated + "...";
    }
  }

  return header + escapeHtml(cleanContent) + footer;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default bot;
