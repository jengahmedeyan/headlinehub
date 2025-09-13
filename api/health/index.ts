import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError } from '../_lib/api-helpers';
import { HealthMonitoringService } from '../../src/services/health-monitoring.service';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const health = await HealthMonitoringService.getSourceHealthMetrics();

    const overallStatus =
      health.summary.critical > 0
        ? "critical"
        : health.summary.warning > 0
        ? "warning"
        : "healthy";

    const responseData = {
      status: overallStatus,
      ...health,
      alerts: health.sources
        .filter((s: { health: { status: string; }; }) => s.health.status !== "healthy")
        .map((s: { name: any; health: { status: any; issues: any; }; }) => ({
          source: s.name,
          severity: s.health.status,
          issues: s.health.issues,
        })),
    };

    sendApiResponse(res, responseData);
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['GET']);