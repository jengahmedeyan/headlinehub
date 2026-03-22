import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError } from '../_lib/api-helpers';
import { HealthMonitoringService } from '../../src/services/health-monitoring.service';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { detailed = "true", hours = "24" } = req.query;
    const hoursNum = parseInt(hours as string, 10);

    if (detailed === "true") {
      const [comprehensive, sourceHealth, trends] = await Promise.all([
        HealthMonitoringService.getComprehensiveScrapingStats(hoursNum),
        HealthMonitoringService.getSourceHealthMetrics(),
        HealthMonitoringService.getScrapingTrends(7),
      ]);

      const responseData = {
        status: comprehensive.summary.totalArticles > 0 ? "healthy" : "warning",
        timestamp: new Date().toISOString(),
        comprehensive,
        sourceHealth,
        trends,
        metadata: {
          generatedAt: new Date().toISOString(),
          period: `${hoursNum} hours`,
          dataFreshness: "real-time",
        },
      };

      sendApiResponse(res, responseData);
    } else {
      const [hourly, daily, weekly] = await Promise.all([
        HealthMonitoringService.getScrapingStats(1),
        HealthMonitoringService.getScrapingStats(24),
        HealthMonitoringService.getScrapingStats(168),
      ]);

      const responseData = {
        status: hourly.totalArticles > 0 ? "healthy" : "warning",
        hourly,
        daily,
        weekly,
        timestamp: new Date().toISOString(),
      };

      sendApiResponse(res, responseData);
    }
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['GET']);