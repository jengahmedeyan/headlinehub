"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperService = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const delay_1 = require("../utils/delay");
class ScraperService {
    async fetchPage(url) {
        await (0, delay_1.delay)(config_1.config.scraper.delayMs);
        return await axios_1.default.get(url, {
            headers: {
                'User-Agent': config_1.config.scraper.userAgent,
            },
            timeout: config_1.config.requestTimeout,
        });
    }
    async extractContentFromDetailPage(link, source) {
        try {
            const response = await this.fetchPage(link);
            const $ = cheerio.load(response.data);
            // Extract all matching content elements and join their text
            const contentElements = $(source.selectors.content);
            const content = contentElements
                .map((_, el) => $(el).text().trim())
                .get()
                .join('\n');
            return content || 'No content found';
        }
        catch (error) {
            logger_1.logger.error('Error extracting content from detail page:', { error, link });
            return 'No content found';
        }
    }
    async extractArticleData(element, $, source) {
        const article = {
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
            }
            else {
                const contentElement = $(element).find(source.selectors.content).first();
                article.content = contentElement.text().trim() || 'No content found';
            }
        }
        catch (error) {
            logger_1.logger.error('Error extracting article data:', { error, source: source.name });
        }
        return article;
    }
    async scrapeSource(source) {
        try {
            logger_1.logger.info(`Starting to scrape: ${source.name}`);
            const response = await this.fetchPage(source.url);
            const $ = cheerio.load(response.data);
            const articles = [];
            const articleElements = $(source.selectors.articles).toArray();
            for (const element of articleElements) {
                const article = await this.extractArticleData(element, $, source);
                if (article.title !== 'No title found' && article.link !== 'No link found') {
                    articles.push(article);
                }
            }
            logger_1.logger.info(`Successfully scraped ${articles.length} articles from ${source.name}`);
            return {
                source: source.name,
                articles,
                success: true,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error(`Error scraping ${source.name}:`, { error: errorMessage });
            return {
                source: source.name,
                articles: [],
                success: false,
                error: errorMessage,
            };
        }
    }
    async scrapeMultipleSources(sources) {
        const results = [];
        for (const source of sources) {
            const result = await this.scrapeSource(source);
            results.push(result);
        }
        return results;
    }
}
exports.ScraperService = ScraperService;
//# sourceMappingURL=scraper.service.js.map