import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
  scraper: {
    delayMs: parseInt(process.env.SCRAPER_DELAY_MS || '1000'),
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    articleConcurrency: parseInt(process.env.SCRAPER_ARTICLE_CONCURRENCY || '5'),
    sourceConcurrency: parseInt(process.env.SCRAPER_SOURCE_CONCURRENCY || '5'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  deduplication: {
    enabled: process.env.DEDUPLICATION_ENABLED === 'false' ? false : true,
    similarityThreshold: parseFloat(process.env.DEDUPLICATION_SIMILARITY_THRESHOLD || '0.8'),
  },
  monitoring: {
    maxFailureCount: parseInt(process.env.MONITORING_MAX_FAILURE_COUNT || '3'),
    alertEmail: process.env.MONITORING_ALERT_EMAIL || 'admin@example.com',
  },
  postgres: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_DATABASE || 'gmscraper',
  },
} as const;
