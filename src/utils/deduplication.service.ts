import crypto from 'crypto';
import { Article, DeduplicationStats } from '../models/article.model';
import { config } from '../config';
import { logger } from './logger';

export class DeduplicationService {
  private static generateArticleHash(article: Article): string {
    const hashString = `${article.title.toLowerCase().trim()}-${article.link}-${article.source}`;
    return crypto.createHash('md5').update(hashString).digest('hex');
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation using Levenshtein distance
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    const maxLen = Math.max(str1.length, str2.length);
    return maxLen === 0 ? 1 : (maxLen - matrix[str2.length][str1.length]) / maxLen;
  }

  static removeDuplicates(articles: Article[]): { articles: Article[], stats: DeduplicationStats } {
    if (!config.deduplication.enabled) {
      return {
        articles,
        stats: {
          totalArticles: articles.length,
          duplicatesFound: 0,
          duplicatesRemoved: 0,
          uniqueArticles: articles.length
        }
      };
    }

    const seenHashes = new Set<string>();
    const seenTitles: { title: string, article: Article }[] = [];
    const uniqueArticles: Article[] = [];
    let duplicatesRemoved = 0;

    for (const article of articles) {
      article.hash = this.generateArticleHash(article);

      if (seenHashes.has(article.hash)) {
        duplicatesRemoved++;
        logger.debug(`Exact duplicate found: ${article.title} from ${article.source}`);
        continue;
      }

      let isSimilar = false;
      for (const seen of seenTitles) {
        const similarity = this.calculateSimilarity(
          article.title.toLowerCase().trim(),
          seen.title.toLowerCase().trim()
        );

        if (similarity >= config.deduplication.similarityThreshold) {
          duplicatesRemoved++;
          logger.debug(`Similar article found: "${article.title}" similar to "${seen.title}" (${Math.round(similarity * 100)}% match)`);
          isSimilar = true;
          break;
        }
      }

      if (!isSimilar) {
        seenHashes.add(article.hash);
        seenTitles.push({ title: article.title, article });
        uniqueArticles.push(article);
      }
    }

    const stats: DeduplicationStats = {
      totalArticles: articles.length,
      duplicatesFound: duplicatesRemoved,
      duplicatesRemoved,
      uniqueArticles: uniqueArticles.length
    };

    logger.info(`Deduplication complete: ${stats.totalArticles} articles → ${stats.uniqueArticles} unique (${stats.duplicatesRemoved} duplicates removed)`);

    return { articles: uniqueArticles, stats };
  }
}
