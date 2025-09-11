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
import { summaryRoutes } from "./routes/summary.route";
import { healthRoutes } from "./routes/health.routes";

const app = express();

app.use(helmet());
app.use(cors());

app.use(createRateLimiter());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/news", newsRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/health', healthRoutes)

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

  cron.schedule("0 * * * *", async () => {
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