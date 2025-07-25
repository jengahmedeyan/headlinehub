import { NewsResponse } from '../models/article.model';
export declare class NewsService {
    private scraperService;
    constructor();
    getAllNews(): Promise<NewsResponse>;
    getNewsBySource(sourceName: string): Promise<NewsResponse>;
    getHealthStatus(): Promise<{
        success: boolean;
        data: any;
    }>;
}
//# sourceMappingURL=news.service.d.ts.map