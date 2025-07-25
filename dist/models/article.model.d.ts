export interface Article {
    id?: string;
    title: string;
    content: string;
    link: string;
    date: string;
    category: string;
    source: string;
    scrapedAt: Date;
    hash?: string;
}
export interface NewsSource {
    name: string;
    url: string;
    selectors: {
        articles: string;
        title: string;
        content: string;
        link: string;
        date: string;
        category: string;
    };
    followLinkForContent?: boolean;
}
export interface ScrapingResult {
    source: string;
    articles: Article[];
    success: boolean;
    error?: string;
    responseTime?: number;
    statusCode?: number;
}
export interface NewsResponse {
    success: boolean;
    data: Article[];
    count: number;
    sources: string[];
    scrapedAt: Date;
    error?: string;
    duplicatesRemoved?: number;
    healthStatus?: SourceHealthStatus[];
}
export interface SourceHealthStatus {
    source: string;
    status: 'healthy' | 'warning' | 'critical' | 'down';
    lastSuccessfulScrape: Date | null;
    failureCount: number;
    lastError?: string;
    responseTime?: number;
    articlesScraped: number;
}
export interface DeduplicationStats {
    totalArticles: number;
    duplicatesFound: number;
    duplicatesRemoved: number;
    uniqueArticles: number;
}
//# sourceMappingURL=article.model.d.ts.map