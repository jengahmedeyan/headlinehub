# HeadlineHub - Vercel Serverless Migration

## Overview

This project has been migrated from Express.js to Vercel serverless functions for better scalability and deployment.

## API Routes

The following API routes are now available as Vercel serverless functions:

### Health Routes
- `GET /api/health` - Get overall system health
- `GET /api/health/stats` - Get detailed health statistics
- `GET /api/health/performance` - Get performance metrics

### News Routes
- `GET /api/news` - Get all news articles (with pagination)
- `GET /api/news/latest` - Get latest news statistics
- `GET /api/news/search?query=keyword` - Search news articles
- `GET /api/news/categories` - Get available categories
- `GET /api/news/sources` - Get available news sources
- `GET /api/news/source/{source}` - Get news by specific source
- `GET /api/news/health` - Get news service health status
- `GET /api/news/test-scrape` - Test scraping functionality
- `GET /api/news/{id}` - Get specific article by ID

### Operations Routes
- `POST /api/operations/scrape` - Trigger RSS scraping
- `POST /api/operations/bot/start` - Start Telegram bot
- `POST /api/operations/bot/stop` - Stop Telegram bot
- `GET /api/operations/bot/status` - Get bot status
- `POST /api/operations/start-all` - Start all services

### Summary Routes
- `POST /api/summaries` - Create new summary
- `POST /api/summaries/generate` - Generate AI summary
- `POST /api/summaries/bulk` - Get bulk summaries
- `GET /api/summaries/{articleId}` - Get summary by article ID
- `DELETE /api/summaries/{articleId}` - Delete summary

## Development

### Local Development
```bash
npm install
npm run dev
```

This will start Vercel dev server locally.

### Deployment
```bash
vercel --prod
```

## Migration Changes

1. **Removed Express.js dependencies**: `express`, `cors`, `helmet`, `express-rate-limit`
2. **Added Vercel runtime**: All routes now use `@vercel/node`
3. **Serverless architecture**: Each route is now an independent serverless function
4. **Shared utilities**: Common functionality moved to `api/_lib/api-helpers.ts`
5. **CORS handling**: Built into the API wrapper functions
6. **Error handling**: Standardized across all functions

## Environment Variables

Make sure to set these in your Vercel dashboard:
- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `ELEVENLABS_API_KEY`
- `GEMINI_API_KEY`

## File Structure

```
api/
├── _lib/
│   └── api-helpers.ts          # Shared utilities
├── health/
│   ├── index.ts               # GET /api/health
│   ├── stats.ts               # GET /api/health/stats
│   └── performance.ts         # GET /api/health/performance
├── news/
│   ├── index.ts               # GET /api/news
│   ├── latest.ts              # GET /api/news/latest
│   ├── search.ts              # GET /api/news/search
│   ├── categories.ts          # GET /api/news/categories
│   ├── sources.ts             # GET /api/news/sources
│   ├── health.ts              # GET /api/news/health
│   ├── test-scrape.ts         # GET /api/news/test-scrape
│   ├── [id].ts                # GET /api/news/{id}
│   └── source/
│       └── [source].ts        # GET /api/news/source/{source}
├── operations/
│   ├── scrape.ts              # POST /api/operations/scrape
│   ├── start-all.ts           # POST /api/operations/start-all
│   └── bot/
│       ├── start.ts           # POST /api/operations/bot/start
│       ├── stop.ts            # POST /api/operations/bot/stop
│       └── status.ts          # GET /api/operations/bot/status
└── summaries/
    ├── index.ts               # POST /api/summaries
    ├── generate.ts            # POST /api/summaries/generate
    ├── bulk.ts                # POST /api/summaries/bulk
    └── [articleId].ts         # GET/DELETE /api/summaries/{articleId}
```

## Notes

- All functions include CORS headers automatically
- Error handling is standardized across all functions
- Rate limiting can be implemented per function if needed
- The Telegram bot and cron jobs may need special handling in serverless environment