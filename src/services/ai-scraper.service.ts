import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
import pLimit from "p-limit";
import sanitizeHtml from "sanitize-html";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config";
import { logger } from "../utils/logger";
import { delay } from "../utils/delay";
import { SCRAPER_CONFIG } from "../config/scraper-config";
import { aiNewsSources, AiNewsSource } from "../config/ai-news-sources";
import prisma from "../utils/prisma";
import { ArticleData, ScrapingSummaryResult } from "../models/article.model";

interface ExtractedArticle {
  title: string;
  link: string;
  content: string;
  date: string | null;
  category: string | null;
}

const VALID_CATEGORIES = [
  "Politics",
  "Business",
  "Sports",
  "Society",
  "Crime",
  "Health",
  "Entertainment",
  "Other",
];

export class AiScraperService {
  private static genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY || ""
  );
  private static model = AiScraperService.genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  static extractArticlesFromHtml = async (
    html: string,
    sourceName: string,
    baseUrl: string
  ): Promise<ExtractedArticle[]> => {
    const $ = cheerio.load(html);
    $("script, style, nav, footer, header, aside, noscript, iframe, form").remove();
    const cleanedHtml = $.html().slice(0, 50000);

    const prompt = `You are a news article extractor. Extract all news articles from the following HTML from the website "${sourceName}" (base URL: ${baseUrl}).

Return ONLY a valid JSON array with no markdown fences or extra text. Each item must have:
- "title": string (article headline)
- "link": string (absolute URL — resolve relative paths using base URL ${baseUrl})
- "content": string (article body text, plain text preferred)
- "date": string or null (ISO 8601 date string if found, otherwise null)
- "category": string or null (news category if found, otherwise null)

HTML:
${cleanedHtml}`;

    try {
      return await this.runExtractionWithRetry(prompt, sourceName);
    } catch (error) {
      logger.error(`Failed to extract articles from ${sourceName}`, { error });
      return [];
    }
  };

  private static runExtractionWithRetry = async (
    prompt: string,
    sourceName: string,
    attempt = 1
  ): Promise<ExtractedArticle[]> => {
    const result = await this.model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip possible markdown code fences
    const jsonText = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error("Response is not an array");
      }
      return parsed.filter(
        (item): item is ExtractedArticle =>
          typeof item.title === "string" &&
          typeof item.link === "string" &&
          item.title.trim() !== "" &&
          item.link.trim() !== ""
      );
    } catch (parseError) {
      if (attempt === 1) {
        logger.warn(
          `JSON parse failed for ${sourceName}, retrying with stricter prompt`
        );
        const stricterPrompt =
          prompt +
          "\n\nIMPORTANT: Your entire response must be ONLY a valid JSON array starting with [ and ending with ]. No other text, no markdown, no explanation.";
        return this.runExtractionWithRetry(stricterPrompt, sourceName, 2);
      }
      logger.error(`Failed to parse Gemini response for ${sourceName}`, {
        parseError,
        responseText: text.slice(0, 500),
      });
      return [];
    }
  };

  static classifyCategory = async (
    title: string,
    content: string
  ): Promise<string> => {
    const plainContent = content.replace(/<[^>]*>/g, "").slice(0, 2000);
    const prompt = `Classify this news article into ONE of these categories: Politics, Business, Sports, Society, Crime, Health, Entertainment, Other.

Title: ${title}
Content excerpt: ${plainContent}

Respond with ONLY the category name, nothing else.`;

    try {
      const result = await this.model.generateContent(prompt);
      const category = result.response.text().trim();
      return VALID_CATEGORIES.includes(category) ? category : "Other";
    } catch (error) {
      logger.warn("Failed to classify category via AI", { title, error });
      return "General";
    }
  };

  private static fetchPage = async (url: string): Promise<string> => {
    await delay(config.scraper.delayMs);
    const response = await axios.get<string>(url, {
      headers: { "User-Agent": config.scraper.userAgent },
      timeout: config.requestTimeout,
    });
    return response.data;
  };

  // Common content selectors for WordPress/news CMS sites, tried in priority order
  private static readonly CONTENT_SELECTORS = [
    ".entry-content",
    ".post-content",
    ".article-content",
    ".article-body",
    ".post-body",
    ".story-body",
    ".story-content",
    ".news-content",
    "article .content",
    "[itemprop='articleBody']",
    ".tdb-block-inner",
    ".td-post-content",
    "article",
    "main",
  ];

  private static fetchArticleContent = async (url: string): Promise<string> => {
    try {
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);
      $(
        "script, style, nav, footer, header, aside, noscript, iframe, form, " +
        ".sharedaddy, .jp-relatedposts, .comments-area, .comment-list, " +
        ".post-navigation, .widget, .sidebar, .advertisement, .ad"
      ).remove();

      let rawHtml = "";

      for (const selector of this.CONTENT_SELECTORS) {
        const el = $(selector).first();
        if (el.length) {
          const candidate = el.html() || "";
          // Quick plain-text length check to confirm it has real content
          const plainLength = el.text().replace(/\s+/g, " ").trim().length;
          if (plainLength >= SCRAPER_CONFIG.MIN_CONTENT_LENGTH) {
            rawHtml = candidate;
            break;
          }
        }
      }

      // Last-resort: collect all <p> tags
      if (!rawHtml) {
        rawHtml = $("p")
          .filter((_, p) => $(p).text().replace(/\s+/g, " ").trim().length > 40)
          .map((_, p) => $.html(p))
          .get()
          .join("\n");
      }

      // Sanitize to allowed tags only, preserving structure
      return sanitizeHtml(rawHtml, {
        allowedTags: SCRAPER_CONFIG.ALLOWED_HTML_TAGS,
        allowedAttributes: SCRAPER_CONFIG.ALLOWED_HTML_ATTRIBUTES,
        transformTags: {
          a: sanitizeHtml.simpleTransform("a", {
            target: "_blank",
            rel: "noopener noreferrer",
          }),
        },
      }).trim();
    } catch (error) {
      logger.warn(`Failed to fetch article content from ${url}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return "";
    }
  };

  private static generateContentHash = (
    title: string,
    content: string
  ): string => {
    const text = `${title}|${content}`.toLowerCase();
    return crypto.createHash("md5").update(text).digest("hex");
  };

  private static scrapeAndSaveSource = async (
    source: AiNewsSource
  ): Promise<ArticleData[]> => {
    const html = await this.fetchPage(source.url);
    const extracted = await this.extractArticlesFromHtml(
      html,
      source.name,
      source.url
    );

    const validItems = extracted.filter(
      (item) => item.title?.trim() && item.link?.trim()
    );

    // Fetch detail pages concurrently (limit to 3 at a time to avoid hammering the server)
    const limit = pLimit(3);
    const articlesWithContent = await Promise.all(
      validItems.map((item) =>
        limit(async () => {
          let content = item.content?.trim() || "";
          if (content.length < SCRAPER_CONFIG.MIN_CONTENT_LENGTH) {
            content = await this.fetchArticleContent(item.link);
          }
          return { ...item, content };
        })
      )
    );

    const saved: ArticleData[] = [];

    for (const item of articlesWithContent) {
      try {
        if (item.content.length < SCRAPER_CONFIG.MIN_CONTENT_LENGTH) {
          logger.warn("Skipping article with insufficient content after detail fetch", {
            title: item.title,
            contentLength: item.content.length,
          });
          continue;
        }

        const date = item.date ?? new Date().toISOString();
        const category =
          item.category || (await this.classifyCategory(item.title, item.content));
        const scrapedAt = new Date().toISOString();
        const hash = this.generateContentHash(item.title, item.content);

        const articleData: ArticleData = {
          title: item.title.trim(),
          link: item.link.trim(),
          source: source.name,
          date,
          content: item.content,
          category,
          scrapedAt,
        };

        await prisma.article.upsert({
          where: { link: articleData.link },
          update: { ...articleData, hash, scrapedAt },
          create: { ...articleData, hash, scrapedAt },
        });

        saved.push(articleData);
        logger.debug(`AI-scraped article saved: ${item.title}`, {
          source: source.name,
        });
      } catch (error) {
        logger.warn("Failed to save AI-extracted article", {
          title: item.title,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info(
      `AI scraper saved ${saved.length} articles from ${source.name}`
    );
    return saved;
  };

  private static processSourceWithRetry = async (
    source: AiNewsSource,
    retryAttempts: number
  ): Promise<ArticleData[]> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        return await this.scrapeAndSaveSource(source);
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

  static scrapeAndSaveAllAiSources = async (
    options: {
      concurrency?: number;
      retryAttempts?: number;
      batchSize?: number;
    } = {}
  ): Promise<ScrapingSummaryResult> => {
    const {
      concurrency = SCRAPER_CONFIG.DEFAULT_CONCURRENCY,
      retryAttempts = SCRAPER_CONFIG.DEFAULT_RETRY_ATTEMPTS,
      batchSize = SCRAPER_CONFIG.DEFAULT_BATCH_SIZE,
    } = options;

    const result: ScrapingSummaryResult = {
      success: 0,
      failed: 0,
      skipped: 0,
      articles: [],
      errors: [],
    };

    logger.info(`Starting AI scraping for ${aiNewsSources.length} sources`, {
      concurrency,
      retryAttempts,
    });

    for (let i = 0; i < aiNewsSources.length; i += batchSize) {
      const batch = aiNewsSources.slice(i, i + batchSize);
      const batchPromises = batch
        .slice(0, concurrency)
        .map((source) =>
          this.processSourceWithRetry(source, retryAttempts)
            .then((articles) => {
              result.success++;
              result.articles.push(...articles);
            })
            .catch((error) => {
              result.failed++;
              result.errors.push({ source: source.name, error: error.message });
              logger.error(`AI scraping failed for source: ${source.name}`, {
                error,
              });
            })
        );

      await Promise.allSettled(batchPromises);

      if (i + batchSize < aiNewsSources.length) {
        await delay(SCRAPER_CONFIG.BATCH_DELAY_MS);
      }
    }

    logger.info("AI scraping completed", {
      totalSources: aiNewsSources.length,
      successful: result.success,
      failed: result.failed,
      articlesProcessed: result.articles.length,
    });

    return result;
  };
}
