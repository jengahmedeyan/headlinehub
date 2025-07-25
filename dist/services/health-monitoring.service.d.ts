import { NewsSource, SourceHealthStatus } from '../models/article.model';
export declare class HealthMonitoringService {
    private static healthStatuses;
    static initializeSource(source: NewsSource): void;
    static recordSuccess(sourceName: string, responseTime: number, articleCount: number): void;
    static recordFailure(sourceName: string, error: string, responseTime?: number): void;
    static getHealthStatus(sourceName?: string): SourceHealthStatus | SourceHealthStatus[];
    private static sendAlert;
    static getOverallHealth(): {
        status: string;
        healthySources: number;
        totalSources: number;
    };
}
//# sourceMappingURL=health-monitoring.service.d.ts.map