import { NewsSource, ScrapingResult } from '../models/article.model';
export declare class ScraperService {
    private fetchPage;
    private extractContentFromDetailPage;
    private extractArticleData;
    scrapeSource(source: NewsSource): Promise<ScrapingResult>;
    scrapeMultipleSources(sources: NewsSource[]): Promise<ScrapingResult[]>;
}
//# sourceMappingURL=scraper.service.d.ts.map