import { HtmlEscaper } from "./htmlEscaper";

export class ArticleFormatter {
  private htmlEscaper: HtmlEscaper;

  constructor() {
    this.htmlEscaper = new HtmlEscaper();
  }

  public formatForTelegram(article: any): string {
    const maxLength = 4096;
    const title = article.title || "No Title";
    let content = article.content || article.description || "No content available";
    const source = article.source || "Unknown Source";
    const publishedAt = article.date
      ? this.formatDate(article.date)
      : "Unknown Date";

    content = this.htmlEscaper.convertToTelegram(content);
    
    const header = `<b>${this.htmlEscaper.escape(title)}</b>\n\n`;
    
    const footer = `\n\n📅 <b>Published:</b> ${publishedAt}\n📰 <b>Source:</b> ${this.htmlEscaper.escape(source)}`;
    
    const availableLength = maxLength - header.length - footer.length - 100;
    
    if (content.length > availableLength) {
      content = this.truncateContent(content, availableLength);
    }

    const finalText = header + content + footer;
    
    if (!this.htmlEscaper.validateTelegramLength(finalText, maxLength)) {
      console.warn('Formatted text exceeds Telegram limit, further truncation may be needed');
    }

    return finalText;
  }

  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    const truncated = content.substring(0, maxLength);
    
    const lastParagraphEnd = truncated.lastIndexOf('\n\n');
    if (lastParagraphEnd > maxLength * 0.7) {
      return this.htmlEscaper.cleanWhitespace(
        truncated.substring(0, lastParagraphEnd) + '\n\nRead more... from the source.'
      );
    }
    
    const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
    let lastSentenceEnd = -1;
    
    for (const ender of sentenceEnders) {
      const index = truncated.lastIndexOf(ender);
      if (index > lastSentenceEnd) {
        lastSentenceEnd = index;
      }
    }
    
    if (lastSentenceEnd > maxLength * 0.8) {
      const endChar = truncated.charAt(lastSentenceEnd);
      const offset = endChar === '.' || endChar === '!' || endChar === '?' ? 1 : 2;
      return this.htmlEscaper.cleanWhitespace(
        truncated.substring(0, lastSentenceEnd + offset) + ' ...'
      );
    }
    
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    if (lastSpaceIndex > maxLength * 0.9) {
      return this.htmlEscaper.cleanWhitespace(
        truncated.substring(0, lastSpaceIndex) + '...'
      );
    }
    
    return this.htmlEscaper.cleanWhitespace(truncated + '...');
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Unknown Date';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Unknown Date';
    }
  }
}