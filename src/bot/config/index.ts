import { BotConfig } from "../types";

export const botConfig: BotConfig = {
  maxArticlesPerList: 10,
  maxTitleLength: 65,
  maxContentLength: 4096,
};

export const messages = {
  welcome: `
🎉 <b>Welcome to HeadlineHub Bot!</b>

Your personal news companion is ready to serve you the latest headlines.

Use /help to explore all available commands and start your news journey!
  `.trim(),

  help: `
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
  `.trim(),

  errors: {
    articleNotFound: "❌ Article not found or could not be loaded.",
    noArticles: "📰 No articles found at the moment. Please try again later.",
    fetchError: "❌ Error fetching latest articles. Please try again later.",
    audioError: "❌ Error generating audio. Please try again later.",
    generalError: "❌ Something went wrong. Please try again later.",
  },

  loading: {
    audio: "🎧 Generating audio... This may take a moment.",
    processing: "Processing...",
  },
};