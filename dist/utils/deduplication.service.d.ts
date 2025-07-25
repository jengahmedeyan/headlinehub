import { Article, DeduplicationStats } from '../models/article.model';
export declare class DeduplicationService {
    private static generateArticleHash;
    private static calculateSimilarity;
    static removeDuplicates(articles: Article[]): {
        articles: Article[];
        stats: DeduplicationStats;
    };
}
//# sourceMappingURL=deduplication.service.d.ts.map