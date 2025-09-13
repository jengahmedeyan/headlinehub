import { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiWrapper, sendApiResponse, handleApiError } from '../_lib/api-helpers';
import prisma from '../../src/utils/prisma';

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { period = "24" } = req.query;
    const hours = parseInt(period as string, 10);

    const performanceData = await prisma.$queryRaw<
      Array<{
        source: string;
        total_articles: number;
        avg_content_length: number;
        first_scrape: string;
        last_scrape: string;
        active_days: number;
      }>
    >`
      SELECT 
        source,
        COUNT(*)::int as total_articles,
        AVG(LENGTH(content))::int as avg_content_length,
        MIN("scrapedAt") as first_scrape,
        MAX("scrapedAt") as last_scrape,
        COUNT(DISTINCT DATE("scrapedAt"))::int as active_days
      FROM "Article" 
      WHERE "scrapedAt" >= ${new Date(Date.now() - hours * 60 * 60 * 1000)}
      GROUP BY source
      ORDER BY total_articles DESC
    `;

    const scoredData = performanceData.map((source: any) => {
      const expectedDailyArticles = 10;
      const actualDailyAvg = source.total_articles / Math.max(1, source.active_days);
      const performanceScore = Math.min(
        100,
        (actualDailyAvg / expectedDailyArticles) * 100
      );

      return {
        ...source,
        performance_score: Math.round(performanceScore),
        daily_average: Math.round(actualDailyAvg * 100) / 100,
        content_quality_score:
          source.avg_content_length > 500
            ? 100
            : Math.round((source.avg_content_length / 500) * 100),
      };
    });

    const responseData = {
      period: `${hours} hours`,
      sources: scoredData,
      summary: {
        total_sources: scoredData.length,
        avg_performance: Math.round(
          scoredData.reduce((sum: number, s: any) => sum + s.performance_score, 0) / scoredData.length
        ),
        top_performer: scoredData[0]?.source,
        needs_attention: scoredData.filter((s: any) => s.performance_score < 50).length,
      },
      timestamp: new Date().toISOString(),
    };

    sendApiResponse(res, responseData);
  } catch (error) {
    handleApiError(res, error as Error);
  }
}

export default withApiWrapper(handler, ['GET']);