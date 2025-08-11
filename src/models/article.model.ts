import { Summary } from "./summary.model";

export interface Article {
  id?: string;
  title: string;
  content: string;
  link: string;
  date: string;
  category: string;
  source: string;
  scrapedAt: Date;
  hash?: string;
  Summarys?: Summary[];
}

export interface NewsSource {
  name: string;
  url: string;
  selectors: {
    articles: string;
    title: string;
    content: string;
    link: string;
    date: string;
    category: string;
  };
  followLinkForContent?: boolean;
}

export interface ScrapingResult {
  source: string;
  articles: Article[];
  success: boolean;
  error?: string;
  responseTime?: number;
  statusCode?: number;
}

export interface ScrapingSummaryResult {
  success: number;
  failed: number;
  skipped: number;
  articles: any[];
  errors: Array<{ source: string; error: string }>;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface NewsResponse {
  success: boolean;
  data: any[];
  count: number;
  sources: string[];
  scrapedAt: Date;
  duplicatesRemoved: number;
  healthStatus?: any;
  error?: string;
  pagination?: PaginationMeta;
}

export interface SourceHealthStatus {
  source: string;
  status: 'healthy' | 'warning' | 'critical' | 'down';
  lastSuccessfulScrape: Date | null;
  failureCount: number;
  lastError?: string;
  responseTime?: number;
  articlesScraped: number;
}

export interface DeduplicationStats {
  totalArticles: number;
  duplicatesFound: number;
  duplicatesRemoved: number;
  uniqueArticles: number;
}


export interface RssSource {
  name: string;
  url: string;
  category?: string;
  rateLimit?: number;
}

export interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  "content:encoded"?: string;
  content?: string;
  contentSnippet?: string;
  categories?: string[];
  description?: string;
  summary?: string;
}

export interface ArticleData {
  title: string;
  link: string;
  source: string;
  date: string;
  content: string;
  category: string;
  scrapedAt: string;
}

export interface ScrapingStatsQuery {
  detailed?: string;
  hours?: string;
  period?: string;
}

export interface ContentQualityMetrics {
  avg_length: number;
  min_length: number;
  max_length: number;
  count: number;
}

export interface HourlyDistribution {
  hour: string;
  count: number;
  unique_sources: number;
}

export interface SourcePerformance {
  source: string;
  count: number;
  avg_length: number;
  min_scraped_at: string;
  max_scraped_at: string;
}

export interface DailyTrend {
  date: string;
  total_articles: number;
  active_sources: number;
  avg_content_length: number;
  categories_count: number;
}

export interface PerformanceMetrics {
  source: string;
  total_articles: number;
  avg_content_length: number;
  first_scrape: string;
  last_scrape: string;
  active_days: number;
  performance_score?: number;
  daily_average?: number;
  content_quality_score?: number;
}

export interface SourceHealthMetrics {
  name: string;
  url: string;
  category: string;
  health: {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  };
  metrics: {
    articles24h: number;
    articles7d: number;
    daysSinceLastScrape: number | null;
    expectedFrequency: number;
    lastSuccessfulScrape?: string;
  };
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
  percentChange?: number;
  recentAverage?: number;
  historicalAverage?: number;
}

export interface ComprehensiveStats {
  period: string;
  timestamp: string;
  summary: {
    totalArticles: number;
    uniqueSources: number;
    avgContentLength: number;
    contentLengthRange: {
      min: number;
      max: number;
    };
  };
  sources: {
    breakdown: Array<{
      source: string;
      _count: { id: number };
    }>;
    performance: Array<{
      name: string;
      articlesCount: number;
      avgContentLength: number;
      firstScraped: string;
      lastScraped: string;
      consistency: number;
    }>;
  };
  quality: {
    duplicates: {
      count: number;
      examples: Array<{
        hash: string;
        _count: { id: number };
      }>;
    };
    categories: Array<{
      category: string;
      _count: { id: number };
    }>;
    avgContentLength: number;
  };
  temporal: {
    hourlyDistribution: HourlyDistribution[];
    peakHour: { hour: string | null; count: number };
    consistency: number;
  };
  errors: {
    bySource: Record<string, number>;
    total: number;
  };
}

export interface SourceHealthSummary {
  timestamp: string;
  sources: SourceHealthMetrics[];
  summary: {
    healthy: number;
    warning: number;
    critical: number;
    total: number;
  };
}

export interface ScrapingTrends {
  period: string;
  dailyBreakdown: DailyTrend[];
  trends: TrendAnalysis;
  insights: string[];
}

export interface ApiResponse<T> {
  status: 'healthy' | 'warning' | 'critical' | 'error';
  timestamp: string;
  data?: T;
  error?: string;
  metadata?: {
    generatedAt: string;
    period: string;
    dataFreshness: string;
  };
}