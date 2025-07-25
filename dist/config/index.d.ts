export declare const config: {
    readonly port: number;
    readonly nodeEnv: string;
    readonly requestTimeout: number;
    readonly rateLimit: {
        readonly windowMs: number;
        readonly maxRequests: number;
    };
    readonly scraper: {
        readonly delayMs: number;
        readonly userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
    };
    readonly logging: {
        readonly level: string;
    };
    readonly deduplication: {
        readonly enabled: boolean;
        readonly similarityThreshold: number;
    };
    readonly monitoring: {
        readonly maxFailureCount: number;
        readonly alertEmail: string;
    };
};
//# sourceMappingURL=index.d.ts.map