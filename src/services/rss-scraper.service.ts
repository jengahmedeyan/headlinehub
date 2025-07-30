// import sanitizeHtml from 'sanitize-html';
// import Parser from 'rss-parser';
// import { rssNewsSources } from '../config/rss-news-sources';
// import prisma from '../utils/prisma';
// import { logger } from '../utils/logger';

// const parser = new Parser();

// export class RssScraperService {
//   static async scrapeAndSaveAllRssNews() {
//     const articles = [];
//     for (const source of rssNewsSources) {
//       try {
//         const feed = await parser.parseURL(source.url);
//         for (const item of feed.items) {
//           const article = await RssScraperService.saveArticle(item, source);
//           if (article) articles.push(article);
//         }
//       } catch (error) {
//         logger.error(`Error scraping RSS for ${source.name}`, { error });
//       }
//     }
//     return articles;
//   }

//   static async saveArticle(item: any, source: any) {
//     try {
//       const rawContent = item['content:encoded'] || item.content || item.contentSnippet || '';
//       let content = sanitizeHtml(rawContent, {
//         allowedTags: [
//           'p', 'b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'br', 'a', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
//         ],
//         allowedAttributes: {
//           a: ['href', 'name', 'target'],
//         },
//         transformTags: {
//           'a': sanitizeHtml.simpleTransform('a', { target: '_blank' })
//         },
//         textFilter: (text: string) => {
//           const unwantedPatterns = [
//             /comments?/i,
//             /login/i,
//             /widget/i,
//             /notice/i,
//             /copyright/i,
//             /advertisement/i,
//             /share/i,
//             /reply/i,
//             /post/i,
//             /fb/i,
//             /social/i,
//             /subscribe/i,
//             /read more/i,
//             /click here/i,
//             /follow/i,
//             /terms/i,
//             /privacy/i,
//             /cookie/i,
//             /policy/i,
//             /powered by/i,
//             /all rights reserved/i
//           ];
//           if (unwantedPatterns.some(pattern => pattern.test(text))) return '';
//           return text;
//         }
//       }).trim();

//       // Save to DB using Prisma upsert
//       const dbArticle = await prisma.article.upsert({
//         where: { link: item.link },
//         update: {
//           title: item.title,
//           source: source.name,
//           date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
//           content,
//           category: item.categories && item.categories.length > 0 ? item.categories[0] : 'General',
//           scrapedAt: new Date().toISOString(),
//         },
//         create: {
//           title: item.title,
//           link: item.link,
//           source: source.name,
//           date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
//           content,
//           category: item.categories && item.categories.length > 0 ? item.categories[0] : 'General',
//           scrapedAt: new Date().toISOString(),
//         },
//       });
//       logger.info(`Article saved: ${item.title}`, dbArticle);
//       return dbArticle;
//     } catch (error) {
//       logger.error('Error scraping RSS article', { error, item });
//       return null;
//     }
//   }
// }


import sanitizeHtml from 'sanitize-html';
import Parser from 'rss-parser';
import { rssNewsSources } from '../config/rss-news-sources';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';
import { SCRAPER_CONFIG } from '../config/scraper-config';
import { delay } from '../utils/delay';

interface RssSource {
  name: string;
  url: string;
  category?: string;
  rateLimit?: number;
}

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  'content:encoded'?: string;
  content?: string;
  contentSnippet?: string;
  categories?: string[];
  description?: string;
  summary?: string;
}

interface ScrapingResult {
  success: number;
  failed: number;
  skipped: number;
  articles: any[];
  errors: Array<{ source: string; error: string; }>;
}

interface ArticleData {
  title: string;
  link: string;
  source: string;
  date: string;
  content: string;
  category: string;
  scrapedAt: string;
}

const parser = new Parser<any, RssItem>();

export class RssScraperService {
  private static rateLimitMap = new Map<string, { lastRequest: number; requestCount: number }>();

  static async scrapeAndSaveAllRssNews(options: {
    concurrency?: number;
    retryAttempts?: number;
    skipRecent?: boolean;
    batchSize?: number;
  } = {}): Promise<ScrapingResult> {
    const {
      concurrency = SCRAPER_CONFIG.DEFAULT_CONCURRENCY,
      retryAttempts = SCRAPER_CONFIG.DEFAULT_RETRY_ATTEMPTS,
      skipRecent = true,
      batchSize = SCRAPER_CONFIG.DEFAULT_BATCH_SIZE
    } = options;

    const result: ScrapingResult = {
      success: 0,
      failed: 0,
      skipped: 0,
      articles: [],
      errors: []
    };

    logger.info(`Starting RSS scraping for ${rssNewsSources.length} sources`, {
      concurrency,
      retryAttempts,
      skipRecent
    });

    for (let i = 0; i < rssNewsSources.length; i += batchSize) {
      const batch = rssNewsSources.slice(i, i + batchSize);
      const batchPromises = batch.map(source => 
        this.processSingleSource(source, { retryAttempts, skipRecent })
          .then(articles => {
            result.success++;
            result.articles.push(...articles);
            return articles;
          })
          .catch(error => {
            result.failed++;
            result.errors.push({ source: source.name, error: error.message });
            logger.error(`Failed to process source: ${source.name}`, { error });
            return [];
          })
      );

      const batchResults = await Promise.allSettled(
        batchPromises.slice(0, concurrency)
      );

      if (i + batchSize < rssNewsSources.length) {
        await delay(SCRAPER_CONFIG.BATCH_DELAY_MS);
      }
    }

    logger.info('RSS scraping completed', {
      totalSources: rssNewsSources.length,
      successful: result.success,
      failed: result.failed,
      articlesProcessed: result.articles.length
    });

    return result;
  }

  private static async processSingleSource(
    source: RssSource, 
    options: { retryAttempts: number; skipRecent: boolean }
  ): Promise<any[]> {
    const { retryAttempts, skipRecent } = options;
    
    await this.applyRateLimit(source);
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        // Check if source was recently scraped (if skipRecent is enabled)
        if (skipRecent && await this.wasRecentlyScraped(source)) {
          logger.info(`Skipping recently scraped source: ${source.name}`);
          return [];
        }

        const feed = await parser.parseURL(source.url);
        const articles: any[] = [];
        
        if (!feed.items || feed.items.length === 0) {
          logger.warn(`No items found in RSS feed: ${source.name}`);
          return [];
        }

        const articlePromises = feed.items.map((item: RssItem) => 
          this.saveArticle(item, source).catch(error => {
            logger.warn(`Failed to save individual article from ${source.name}`, { 
              error: error.message,
              articleTitle: item.title || 'Unknown'
            });
            return null;
          })
        );

        const results = await Promise.allSettled(articlePromises);
        
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            articles.push(result.value);
          }
        });

        logger.info(`Successfully processed ${articles.length} articles from ${source.name}`);
        return articles;

      } catch (error) {
        lastError = error as Error;
        logger.warn(`Attempt ${attempt}/${retryAttempts} failed for ${source.name}`, { 
          error: error instanceof Error ? error.message : String(error)
        });
        
        if (attempt < retryAttempts) {
          await delay(SCRAPER_CONFIG.RETRY_DELAY_MS * attempt);
        }
      }
    }

    throw lastError || new Error(`Failed after ${retryAttempts} attempts`);
  }

  static async saveArticle(item: RssItem, source: RssSource): Promise<any | null> {
    try {
      if (!item.link || !item.title) {
        logger.warn('Skipping article with missing required fields', { 
          title: item.title, 
          link: item.link, 
          source: source.name 
        });
        return null;
      }

      const rawContent = this.extractContent(item);
      const content = this.sanitizeContent(rawContent);
      
      if (!content || content.length < SCRAPER_CONFIG.MIN_CONTENT_LENGTH) {
        logger.warn('Skipping article with insufficient content', { 
          title: item.title,
          contentLength: content.length 
        });
        return null;
      }

      const publishedDate = this.parseDate(item.pubDate);
      
      const category = this.determineCategory(item, source);

      const articleData: ArticleData = {
        title: item.title.trim(),
        link: item.link,
        source: source.name,
        date: publishedDate,
        content,
        category,
        scrapedAt: new Date().toISOString(),
      };

      const hash = this.generateContentHash(articleData);
      
      const dbArticle = await prisma.article.upsert({
        where: { link: item.link },
        update: {
          ...articleData,
          hash,
          scrapedAt: new Date().toISOString(),
        },
        create: {
          ...articleData,
          hash,
          scrapedAt: new Date().toISOString(),
        },
      });

      logger.debug(`Article processed: ${item.title}`, { id: dbArticle.id });
      return dbArticle;

    } catch (error) {
      logger.error('Error processing RSS article', { 
        error: error instanceof Error ? error.message : String(error),
        title: item.title,
        link: item.link,
        source: source.name
      });
      return null;
    }
  }


  private static extractContent(item: RssItem): string {
    return item['content:encoded'] || '';
  }

  private static sanitizeContent(rawContent: string): string {
    if (!rawContent) return '';

    return sanitizeHtml(rawContent, {
      allowedTags: SCRAPER_CONFIG.ALLOWED_HTML_TAGS,
      allowedAttributes: SCRAPER_CONFIG.ALLOWED_HTML_ATTRIBUTES,
      transformTags: {
        'a': sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' })
      },
      textFilter: (text: string) => {
        if (SCRAPER_CONFIG.UNWANTED_TEXT_PATTERNS.some(pattern => pattern.test(text.trim()))) {
          return '';
        }
        
        return text.replace(/\s+/g, ' ').trim();
      }
    }).trim();
  }

  private static parseDate(pubDate?: string): string {
    if (!pubDate) return new Date().toISOString();
    
    try {
      const date = new Date(pubDate);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      
      const now = new Date();
      const maxFuture = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      const minPast = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
      
      if (date > maxFuture || date < minPast) {
        logger.warn(`Date out of reasonable range: ${pubDate}, using current date`);
        return now.toISOString();
      }
      
      return date.toISOString();
    } catch (error) {
      logger.warn(`Invalid publication date: ${pubDate}, using current date`);
      return new Date().toISOString();
    }
  }

  private static determineCategory(item: RssItem, source: RssSource): string {
    if (source.category) return source.category;
    
    if (item.categories && item.categories.length > 0) {
      return item.categories[0];
    }
    
    return 'General';
  }

  private static generateContentHash(article: ArticleData): string {
    const crypto = require('crypto');
    const content = `${article.title}|${article.content}`.toLowerCase();
    return crypto.createHash('md5').update(content).digest('hex');
  }


  private static async applyRateLimit(source: RssSource): Promise<void> {
    const rateLimit = source.rateLimit || SCRAPER_CONFIG.DEFAULT_RATE_LIMIT;
    const now = Date.now();
    const key = source.url;
    
    const rateLimitData = this.rateLimitMap.get(key) || { lastRequest: 0, requestCount: 0 };
    
    if (now - rateLimitData.lastRequest > 60000) {
      rateLimitData.requestCount = 0;
    }
    
    if (rateLimitData.requestCount >= rateLimit) {
      const waitTime = 60000 - (now - rateLimitData.lastRequest);
      if (waitTime > 0) {
        logger.info(`Rate limiting ${source.name}, waiting ${waitTime}ms`);
        await delay(waitTime);
      }
      rateLimitData.requestCount = 0;
    }
    
    rateLimitData.lastRequest = now;
    rateLimitData.requestCount++;
    this.rateLimitMap.set(key, rateLimitData);
  }


  private static async wasRecentlyScraped(source: RssSource): Promise<boolean> {
    try {
      const recentThreshold = new Date(Date.now() - SCRAPER_CONFIG.RECENT_SCRAPE_THRESHOLD_MS);
      
      const recentArticle = await prisma.article.findFirst({
        where: {
          source: source.name,
          scrapedAt: {
            gte: recentThreshold.toISOString()
          }
        },
        orderBy: { scrapedAt: 'desc' }
      });
      
      return !!recentArticle;
    } catch (error) {
      logger.warn('Error checking recent scrape status', { error, source: source.name });
      return false;
    }
  }

  static async getScrapingStats(hours: number = 24): Promise<any> {
    try {
      const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      const stats = await prisma.article.groupBy({
        by: ['source'],
        where: {
          scrapedAt: {
            gte: since.toISOString()
          }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      });
      
      return {
        period: `${hours} hours`,
        totalArticles: stats.reduce((sum, stat) => sum + stat._count.id, 0),
        sourceBreakdown: stats
      };
    } catch (error) {
      logger.error('Error getting scraping stats', { error });
      throw error;
    }
  }
}