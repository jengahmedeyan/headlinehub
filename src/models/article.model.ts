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