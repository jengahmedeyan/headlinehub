import { Request, Response } from 'express';
export declare class NewsController {
    private newsService;
    constructor();
    getAllNews: (req: Request, res: Response) => Promise<void>;
    getNewsBySource: (req: Request, res: Response) => Promise<void>;
    getAvailableSources: (req: Request, res: Response) => Promise<void>;
    getHealthStatus: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=news.controller.d.ts.map