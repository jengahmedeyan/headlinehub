import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { Article, NewsSource, ScrapingResult } from '../models/article.model';
import { config } from '../config';
import { logger } from '../utils/logger';
import { delay } from '../utils/delay';
import { newsSources } from '../config/news-sources';
import pLimit from 'p-limit';
import prisma from '../utils/prisma';

export class ScraperService {
  private async fetchPage(url: string): Promise<AxiosResponse<string>> {
    await delay(config.scraper.delayMs);
    
    return await axios.get(url, {
      headers: {
        'User-Agent': config.scraper.userAgent,
      },
      timeout: config.requestTimeout,
    });
  }

  private async extractContentFromDetailPage(link: string, source: NewsSource): Promise<string> {
    try {
      const response = await this.fetchPage(link);
      const $ = cheerio.load(response.data);
      
      const contentElements = $(source.selectors.content);
      const content = contentElements
        .map((_, el) => this.extractFormattedText($(el)))
        .get()
        .join('\n\n');
        
      return content || 'No content found';
    } catch (error) {
      logger.error('Error extracting content from detail page:', { error, link });
      return 'No content found';
    }
  }

private extractFormattedText($element: cheerio.Cheerio<any>): string {
  const $cloned = $element.clone();
  
  $cloned.find('p').each((_, el) => {
    const $p = $cloned.find(el);
    const htmlContent = $p.html();
    if (htmlContent) {
      $p.after('\n\n').replaceWith(htmlContent);
    }
  });
  
  $cloned.find('br').replaceWith('\n');
  $cloned.find('div').each((_, el) => {
    const $div = $cloned.find(el);
    const htmlContent = $div.html();
    if (htmlContent) {
      $div.after('\n').replaceWith(htmlContent);
    }
  });
  
  $cloned.find('li').each((_, el) => {
    const $li = $cloned.find(el);
    $li.before('• ').after('\n');
  });
  
  $cloned.find('ul, ol').each((_, el) => {
    const $list = $cloned.find(el);
    $list.before('\n').after('\n');
  });
  
  $cloned.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const $heading = $cloned.find(el);
    $heading.before('\n\n').after('\n\n');
  });
  
  $cloned.find('blockquote').each((_, el) => {
    const $quote = $cloned.find(el);
    const text = $quote.text().trim();
    $quote.replaceWith(`\n\n"${text}"\n\n`);
  });
  
  let text = $cloned.text();
  
  text = text
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n')
    .trim();
  
  return text;
}

  private async extractArticleData(
    element: any,
    $: cheerio.CheerioAPI,
    source: NewsSource
  ): Promise<Article> {
    const article: Article = {
      title: '',
      content: '',
      link: '',
      date: '',
      category: '',
      source: source.name,
      scrapedAt: new Date(),
    };

    try {
      const titleElement = $(element).find(source.selectors.title).first();
      article.title = titleElement.text().trim() || 'No title found';

      const linkElement = $(element).find(source.selectors.link).first();
      let link = linkElement.attr('href') || '';
      if (link && !link.startsWith('http')) {
        const baseUrl = new URL(source.url).origin;
        link = new URL(link, baseUrl).href;
      }
      article.link = link || 'No link found';

      const dateElement = $(element).find(source.selectors.date).first();
      article.date = dateElement.text().trim() || dateElement.attr('datetime') || 'No date found';

      const categoryElement = $(element).find(source.selectors.category).first();
      article.category = categoryElement.text().trim() || 'No category found';

      if (source.followLinkForContent && article.link !== 'No link found') {
        article.content = await this.extractContentFromDetailPage(article.link, source);
      } else {
        const contentElement = $(element).find(source.selectors.content).first();
        article.content = this.extractFormattedText(contentElement) || 'No content found';
      }
    } catch (error) {
      logger.error('Error extracting article data:', { error, source: source.name });
    }

    return article;
  }

  async scrapeSource(source: NewsSource): Promise<ScrapingResult> {
    try {
      logger.info(`Starting to scrape: ${source.name}`);

      const response = await this.fetchPage(source.url);
      const $ = cheerio.load(response.data);
      const articles: Article[] = [];

      const articleElements = $(source.selectors.articles).toArray();
      const articleConcurrency = config.scraper?.articleConcurrency || 5;
      const articleLimit = pLimit(articleConcurrency);
      const articlePromises = articleElements.map(element =>
        articleLimit(() => this.extractArticleData(element, $, source))
      );
      const extractedArticles = await Promise.all(articlePromises);
      
      for (const article of extractedArticles) {
        if (article.title !== 'No title found' && article.link !== 'No link found') {
          articles.push(article);
        }
      }

      logger.info(`Successfully scraped ${articles.length} articles from ${source.name}`);

      return {
        source: source.name,
        articles,
        success: true,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error scraping ${source.name}:`, { error: errorMessage });

      return {
        source: source.name,
        articles: [],
        success: false,
        error: errorMessage,
      };
    }
  }

  async scrapeMultipleSources(sources: NewsSource[]): Promise<ScrapingResult[]> {
    const sourceConcurrency = config.scraper?.sourceConcurrency || 5;
    const sourceLimit = pLimit(sourceConcurrency);
    const scrapePromises = sources.map(source => sourceLimit(() => this.scrapeSource(source)));
    return Promise.all(scrapePromises);
  }

  async saveArticlesToDb(articles: Article[]): Promise<void> {
    for (const article of articles) {
      try {
        await prisma.article.upsert({
          where: { link: article.link },
          update: { ...article },
          create: { ...article },
        });
      } catch (err) {
        if (!String(err).includes('Unique constraint')) {
          logger.error('Error saving article to DB:', { err, article });
        }
      }
    }
  }
}

export function formatArticleForTelegram(article: any): string {
  const maxLength = 4096;
  const title = article.title || 'No Title';
  const content = article.content || article.description || 'No content available';
  const source = article.source || 'Unknown Source';
  const publishedAt = article.publishedAt ? 
    new Date(article.publishedAt).toLocaleDateString() : 'Unknown Date';

  let cleanContent = content
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();

  const header = `<b>${escapeHtml(title)}</b>\n\n`;
  const footer = `\n\n📅 <b>Published:</b> ${publishedAt}\n📰 <b>Source:</b> ${escapeHtml(source)}`;
  
  const availableLength = maxLength - header.length - footer.length - 100;
  
  if (cleanContent.length > availableLength) {
    const truncated = cleanContent.substring(0, availableLength);
    const lastParagraphEnd = truncated.lastIndexOf('\n\n');
    
    if (lastParagraphEnd > availableLength * 0.7) {
      cleanContent = truncated.substring(0, lastParagraphEnd) + '\n\n...';
    } else {
      cleanContent = truncated + '...';
    }
  }

  return header + escapeHtml(cleanContent) + footer;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function scrapeAndSaveAllNews() {
  const scraper = new ScraperService();
  const sources = Object.values(newsSources);
  const results = await scraper.scrapeMultipleSources(sources);
  const allArticles = results.flatMap(r => r.articles);
  await scraper.saveArticlesToDb(allArticles);
  logger.info(`Saved ${allArticles.length} articles to DB.`);
}