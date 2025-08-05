export class HtmlEscaper {
  private readonly htmlEntities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&hellip;': '…',
    '&mdash;': '—',
    '&ndash;': '–',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&ldquo;': '\u201C',
    '&rdquo;': '\u201D'
  };

  public escape(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  public decode(text: string): string {
    if (!text) return '';
    
    let decoded = text;
    
    for (const [entity, char] of Object.entries(this.htmlEntities)) {
      decoded = decoded.replace(new RegExp(entity, 'gi'), char);
    }
    
    decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
      return String.fromCharCode(parseInt(dec, 10));
    });
    
    decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
    
    return decoded;
  }

  public stripTags(html: string): string {
    if (!html) return '';
    
    return html.replace(/<[^>]*>/g, '');
  }

  public convertToTelegram(html: string): string {
    if (!html) return '';
    
    let text = html;
    
    text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '<b>$1</b>');
    text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '<b>$1</b>');
    text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '<i>$1</i>');
    text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '<i>$1</i>');
    text = text.replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>');
    text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '<code>$1</code>');
    text = text.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '<pre>$1</pre>');
    
    text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
    text = text.replace(/<p[^>]*>/gi, '');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/div>\s*<div[^>]*>/gi, '\n\n');
    text = text.replace(/<div[^>]*>/gi, '');
    text = text.replace(/<\/div>/gi, '\n');
    
    text = text.replace(/<\/li>\s*<li[^>]*>/gi, '\n• ');
    text = text.replace(/<ul[^>]*>\s*<li[^>]*>/gi, '• ');
    text = text.replace(/<ol[^>]*>\s*<li[^>]*>/gi, '1. ');
    text = text.replace(/<\/li>\s*<\/[uo]l>/gi, '');
    text = text.replace(/<li[^>]*>/gi, '• ');
    text = text.replace(/<\/li>/gi, '');
    text = text.replace(/<\/?[uo]l[^>]*>/gi, '');
    
    text = this.stripTags(text);
    
    text = this.decode(text);
    
    text = this.cleanWhitespace(text);
    
    return text;
  }


  public cleanWhitespace(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .replace(/[ \t]+$/gm, '')
      .trim();
  }

  public validateTelegramLength(text: string, maxLength: number = 4096): boolean {
    return text.length <= maxLength;
  }

}