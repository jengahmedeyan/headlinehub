import sanitizeHtml from "sanitize-html";
import Parser from "rss-parser";
import { rssNewsSources } from "../config/rss-news-sources";
import prisma from "../utils/prisma";
import { logger } from "../utils/logger";
import { SCRAPER_CONFIG } from "../config/scraper-config";
import { delay } from "../utils/delay";
import { ArticleData, RssItem, RssSource, ScrapingSummaryResult } from "../models/article.model";

const parser = new Parser<any, RssItem>();

export class RssScraperService {
  private static rateLimitMap = new Map<
    string,
    { lastRequest: number; requestCount: number }
  >();

  static scrapeAndSaveAllRssNews = async (
    options: {
      concurrency?: number;
      retryAttempts?: number;
      skipRecent?: boolean;
      batchSize?: number;
      dryRun?: boolean;
    } = {}
  ): Promise<ScrapingSummaryResult> => {
    const {
      concurrency = SCRAPER_CONFIG.DEFAULT_CONCURRENCY,
      retryAttempts = SCRAPER_CONFIG.DEFAULT_RETRY_ATTEMPTS,
      skipRecent = true,
      batchSize = SCRAPER_CONFIG.DEFAULT_BATCH_SIZE,
      dryRun = false,
    } = options;

    const result: ScrapingSummaryResult = {
      success: 0,
      failed: 0,
      skipped: 0,
      articles: [],
      errors: [],
    };

    logger.info(`Starting RSS scraping for ${rssNewsSources.length} sources`, {
      concurrency,
      retryAttempts,
      skipRecent,
    });

    for (let i = 0; i < rssNewsSources.length; i += batchSize) {
      const batch = rssNewsSources.slice(i, i + batchSize);
      const batchPromises = batch.map((source) =>
        this.processSingleSource(source, { retryAttempts, skipRecent, dryRun })
          .then((articles) => {
            result.success++;
            result.articles.push(...articles);
            return articles;
          })
          .catch((error) => {
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

    logger.info("RSS scraping completed", {
      totalSources: rssNewsSources.length,
      successful: result.success,
      failed: result.failed,
      articlesProcessed: result.articles.length,
    });

    return result;
  };

  private static processSingleSource = async (
    source: RssSource,
    options: { retryAttempts: number; skipRecent: boolean; dryRun: boolean }
  ): Promise<any[]> => {
    const { retryAttempts, skipRecent, dryRun = false } = options;

    await this.applyRateLimit(source);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        if (skipRecent && (await this.wasRecentlyScraped(source))) {
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
          dryRun
            ? this.processArticleWithoutSaving(item, source)
            : this.saveArticle(item, source).catch((error) => {
                logger.warn(
                  `Failed to save individual article from ${source.name}`,
                  {
                    error: error.message,
                    articleTitle: item.title || "Unknown",
                  }
                );
                return null;
              })
        );

        const results = await Promise.allSettled(articlePromises);

        results.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            articles.push(result.value);
          }
        });

        logger.info(
          `Successfully processed ${articles.length} articles from ${source.name}`
        );
        return articles;
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          `Attempt ${attempt}/${retryAttempts} failed for ${source.name}`,
          {
            error: error instanceof Error ? error.message : String(error),
          }
        );

        if (attempt < retryAttempts) {
          await delay(SCRAPER_CONFIG.RETRY_DELAY_MS * attempt);
        }
      }
    }

    throw lastError || new Error(`Failed after ${retryAttempts} attempts`);
  };

  static saveArticle = async (
    item: RssItem,
    source: RssSource
  ): Promise<any | null> => {
    try {
      if (!item.link || !item.title) {
        logger.warn("Skipping article with missing required fields", {
          title: item.title,
          link: item.link,
          source: source.name,
        });
        return null;
      }

      const rawContent = this.extractContent(item);
      const content = this.sanitizeContent(rawContent);

      if (!content || content.length < SCRAPER_CONFIG.MIN_CONTENT_LENGTH) {
        logger.warn("Skipping article with insufficient content", {
          title: item.title,
          contentLength: content.length,
        });
        return null;
      }

      if (this.isUnwantedContent(content)) {
        logger.warn("Skipping article with unwanted content patterns", {
          title: item.title,
          source: source.name,
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
      logger.error("Error processing RSS article", {
        error: error instanceof Error ? error.message : String(error),
        title: item.title,
        link: item.link,
        source: source.name,
      });
      return null;
    }
  };

  private static extractContent = (item: RssItem): string => {
    return item["content:encoded"] || item.content || item.description || "";
  };

  private static sanitizeContent(rawContent: string): string {
    if (!rawContent) return "";

    let cleanContent = rawContent;

    SCRAPER_CONFIG.CONTENT_BLOCK_FILTERS.forEach((pattern) => {
      cleanContent = cleanContent.replace(pattern, "");
    });

    const sanitized = sanitizeHtml(cleanContent, {
      allowedTags: SCRAPER_CONFIG.ALLOWED_HTML_TAGS,
      allowedAttributes: SCRAPER_CONFIG.ALLOWED_HTML_ATTRIBUTES,
      transformTags: {
        a: sanitizeHtml.simpleTransform("a", {
          target: "_blank",
          rel: "noopener noreferrer",
        }),
      },
      exclusiveFilter: (frame) => {
        if (frame.attribs) {
          const classNames = frame.attribs.class || "";
          const id = frame.attribs.id || "";
          const dataHref = frame.attribs["data-href"] || "";

          const unwantedPatterns = [
            /fb-/i,
            /facebook/i,
            /social/i,
            /comment/i,
            /widget/i,
            /alert/i,
            /notice/i,
            /warning/i,
          ];

          return unwantedPatterns.some(
            (pattern) =>
              pattern.test(classNames) ||
              pattern.test(id) ||
              pattern.test(dataHref)
          );
        }
        return false;
      },
      textFilter: (text: string) => {
        const trimmedText = text.trim();

        if (
          SCRAPER_CONFIG.UNWANTED_TEXT_PATTERNS.some((pattern) =>
            pattern.test(trimmedText)
          )
        ) {
          return "";
        }

        if (
          trimmedText.toLowerCase().includes("facebook notice") ||
          trimmedText.toLowerCase().includes("login to view") ||
          trimmedText.toLowerCase().includes("fb comments")
        ) {
          return "";
        }

        return text.replace(/\s+/g, " ").trim();
      },
    });

    return sanitized.trim();
  }

  private static isUnwantedContent = (content: string): boolean => {
    const cleanText = content
      .replace(/<[^>]*>/g, "")
      .toLowerCase()
      .trim();

    if (cleanText.length < 200) {
      const unwantedKeywords = [
        "facebook notice",
        "login to view",
        "fb comments",
        "you need to login",
        "post fb comments",
        "view and post",
        "comments",
        "widget",
        "notice",
      ];

      const unwantedCount = unwantedKeywords.filter((keyword) =>
        cleanText.includes(keyword)
      ).length;

      return unwantedCount / unwantedKeywords.length > 0.3;
    }

    return false;
  };

  private static parseDate = (pubDate?: string): string => {
    if (!pubDate) return new Date().toISOString();

    try {
      const date = new Date(pubDate);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date");
      }

      const now = new Date();
      const maxFuture = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const minPast = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      if (date > maxFuture || date < minPast) {
        logger.warn(
          `Date out of reasonable range: ${pubDate}, using current date`
        );
        return now.toISOString();
      }

      return date.toISOString();
    } catch (error) {
      logger.warn(`Invalid publication date: ${pubDate}, using current date`);
      return new Date().toISOString();
    }
  };

  private static determineCategory = (
    item: RssItem,
    source: RssSource
  ): string => {
    if (source.category) return source.category;

    if (item.categories && item.categories.length > 0) {
      return item.categories[0];
    }

    return "General";
  };

  private static generateContentHash = (article: ArticleData): string => {
    const crypto = require("crypto");
    const content = `${article.title}|${article.content}`.toLowerCase();
    return crypto.createHash("md5").update(content).digest("hex");
  };

  private static applyRateLimit = async (source: RssSource): Promise<void> => {
    const rateLimit = source.rateLimit || SCRAPER_CONFIG.DEFAULT_RATE_LIMIT;
    const now = Date.now();
    const key = source.url;

    const rateLimitData = this.rateLimitMap.get(key) || {
      lastRequest: 0,
      requestCount: 0,
    };

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
  };

  private static wasRecentlyScraped = async (
    source: RssSource
  ): Promise<boolean> => {
    try {
      const recentThreshold = new Date(
        Date.now() - SCRAPER_CONFIG.RECENT_SCRAPE_THRESHOLD_MS
      );

      const recentArticle = await prisma.article.findFirst({
        where: {
          source: source.name,
          scrapedAt: {
            gte: recentThreshold.toISOString(),
          },
        },
        orderBy: { scrapedAt: "desc" },
      });

      return !!recentArticle;
    } catch (error) {
      logger.warn("Error checking recent scrape status", {
        error,
        source: source.name,
      });
      return false;
    }
  };


  static processArticleWithoutSaving = async (
    item: RssItem,
    source: RssSource
  ): Promise<any | null> => {
    try {
      if (!item.link || !item.title) {
        logger.warn("Skipping article with missing required fields", {
          title: item.title,
          link: item.link,
          source: source.name,
        });
        return null;
      }

      const rawContent = this.extractContent(item);
      const content = this.sanitizeContent(rawContent);

      if (!content || content.length < SCRAPER_CONFIG.MIN_CONTENT_LENGTH) {
        logger.warn("Skipping article with insufficient content", {
          title: item.title,
          contentLength: content.length,
        });
        return null;
      }

      if (this.isUnwantedContent(content)) {
        logger.warn("Skipping article with unwanted content patterns", {
          title: item.title,
          source: source.name,
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

      const processedArticle = {
        ...articleData,
        hash,
        id: `dry-run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      logger.debug(`Article processed (dry run): ${item.title}`, {
        source: source.name,
        contentLength: content.length,
      });

      return processedArticle;
    } catch (error) {
      logger.error("Error processing RSS article (dry run)", {
        error: error instanceof Error ? error.message : String(error),
        title: item.title,
        link: item.link,
        source: source.name,
      });
      return null;
    }
  }
}
