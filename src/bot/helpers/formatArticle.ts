import { HtmlEscaper } from "./htmlEscaper";

export class ArticleFormatter {
  private htmlEscaper: HtmlEscaper;

  constructor() {
    this.htmlEscaper = new HtmlEscaper();
  }

  public formatForTelegram(article: any): string {
    const maxLength = 4096;
    const title = article.title || "No Title";
    const content = article.content || article.description || "No content available";
    const source = article.source || "Unknown Source";
    const publishedAt = article.date
      ? this.formatDate(article.date)
      : "Unknown Date";

    let cleanContent = this.cleanHtmlEntities(content);

    const header = `<b>${this.htmlEscaper.escape(title)}</b>\n\n`;
    const footer = `\n\n📅 <b>Published:</b> ${publishedAt}\n📰 <b>Source:</b> ${this.htmlEscaper.escape(source)}`;

    const availableLength = maxLength - header.length - footer.length - 100;

    if (cleanContent.length > availableLength) {
      cleanContent = this.truncateContent(cleanContent, availableLength);
    }

    return header + this.htmlEscaper.escape(cleanContent) + footer;
  }

  private cleanHtmlEntities(content: string): string {
    return content
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .trim();
  }

  private truncateContent(content: string, maxLength: number): string {
    const truncated = content.substring(0, maxLength);
    const lastParagraphEnd = truncated.lastIndexOf("\n\n");

    if (lastParagraphEnd > maxLength * 0.7) {
      return truncated.substring(0, lastParagraphEnd) + "\n\n...";
    }
    
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf(". "),
      truncated.lastIndexOf("! "),
      truncated.lastIndexOf("? ")
    );

    if (lastSentenceEnd > maxLength * 0.8) {
      return truncated.substring(0, lastSentenceEnd + 1) + " ...";
    }

    return truncated + "...";
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch {
      return "Unknown Date";
    }
  }
}