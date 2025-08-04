import express from "express";
import cors from "cors";
import helmet from "helmet";
import { logger } from "./utils/logger";
import { newsRoutes } from "./routes/news.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { createRateLimiter } from "./middleware/rate-limit.middleware";
import { newsSources } from "./config/news-sources";
import { config } from "./config";
import cron from "node-cron";
import { RssScraperService } from "./services/rss-scraper.service";
import headlineHubBot from "./bot";

const app = express();

app.use(helmet());
app.use(cors());

app.use(createRateLimiter());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/test-scrape", async (req, res) => {
  try {
    const sourceKey = req.query.source as string;
    let sourcesToScrape;
    if (sourceKey) {
      const { rssNewsSources } = await import("./config/rss-news-sources");
      const source = rssNewsSources.find((s: any) => s.name === sourceKey);
      if (!source) {
        return res
          .status(400)
          .json({ success: false, error: `Unknown RSS source: ${sourceKey}` });
      }
      sourcesToScrape = [source];
    } else {
      const { rssNewsSources } = await import("./config/rss-news-sources");
      sourcesToScrape = rssNewsSources;
    }
    const result = await RssScraperService.scrapeAndSaveAllRssNews({
      batchSize: sourcesToScrape.length,
       dryRun: true
    });
    res.json(result);
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

app.get("/api/health/scraping", async (req, res) => {
  try {
    const [hourly, daily] = await Promise.all([
      RssScraperService.getScrapingStats(1),
      RssScraperService.getScrapingStats(24),
    ]);

    res.json({
      status: hourly.totalArticles > 0 ? "healthy" : "warning",
      hourly,
      daily,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ status : "error", error: error.message });
  }
});

app.use("/api/news", newsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = () => {
  app.listen(config.port, () => {
    logger.info(`🚀 Server running on port ${config.port}`);
    logger.info(
      `📰 HeadlineHub ready for ${Object.keys(newsSources).length} sources`
    );
    logger.info(`🌍 Environment: ${config.nodeEnv}`);
  });

  headlineHubBot.start();

  cron.schedule("0 */5 * * *", async () => {
    logger.info("⏰ Starting scheduled RSS news scraping...");
    await RssScraperService.scrapeAndSaveAllRssNews();
    logger.info("✅ Scheduled RSS news scraping complete.");
  });
};

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

export { app };