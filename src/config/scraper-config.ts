export const SCRAPER_CONFIG = {
  DEFAULT_CONCURRENCY: 3,
  DEFAULT_BATCH_SIZE: 20,
  DEFAULT_RETRY_ATTEMPTS: 3,
  
  BATCH_DELAY_MS: 1000,
  RETRY_DELAY_MS: 2000,
  RECENT_SCRAPE_THRESHOLD_MS: 2 * 60 * 60 * 1000,
  
  DEFAULT_RATE_LIMIT: 10,
  
  MIN_CONTENT_LENGTH: 100,
  
  ALLOWED_HTML_TAGS: [
    'p', 'b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'br', 'a', 
    'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span',
    'div', 'img', 'figure', 'figcaption'
  ],
  
  ALLOWED_HTML_ATTRIBUTES: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height']
  },

  UNWANTED_TEXT_PATTERNS: [
    /^comments?$/i,
    /^login$/i,
    /^widget$/i,
    /^notice$/i,
    /^copyright$/i,
    /^advertisement$/i,
    /^share$/i,
    /^reply$/i,
    /^post$/i,
    /^fb$/i,
    /^social$/i,
    /^subscribe$/i,
    /^read more$/i,
    /^click here$/i,
    /^follow$/i,
    /^terms$/i,
    /^privacy$/i,
    /^cookie$/i,
    /^policy$/i,
    /^powered by/i,
    /^all rights reserved$/i,
    /facebook notice for eu/i,
    /you need to login to view and post fb comments/i,
    /fb comments?/i,
    /facebook comments?/i,
    /login to view.*comments?/i,
    /view and post.*comments?/i,
    /like.*share.*comment/i,
    /follow us on/i,
    /join.*conversation/i,
    /sign up.*newsletter/i,
    /^\s*$/,
    /^(\.|\,|\;|\:)+$/,
  ] as RegExp[],

  UNWANTED_HTML_PATTERNS: [
    /fb-comments?/i,
    /fb-background-color/i,
    /facebook.*widget/i,
    /social.*widget/i,
    /share.*widget/i,
    /comment.*widget/i,
    /alert.*warning/i,
    /notice.*eu/i,
    /widget.*sidebar/i,
    /advertisement/i,
    /sponsor/i,
  ] as RegExp[],

  CONTENT_BLOCK_FILTERS: [
    // Facebook notice blocks
    /facebook notice for eu.*?you need to login to view and post fb comments/is,
    /fb-comments.*?<\/div>/is,
    /fb-background-color.*?<\/div>/is,
    // General social media blocks
    /<div[^>]*class="[^"]*social[^"]*"[^>]*>.*?<\/div>/is,
    /<div[^>]*class="[^"]*comment[^"]*"[^>]*>.*?<\/div>/is,
    /<div[^>]*class="[^"]*fb-[^"]*"[^>]*>.*?<\/div>/is,
    // Alert/warning blocks
    /<div[^>]*class="[^"]*alert[^"]*warning[^"]*"[^>]*>.*?<\/div>/is,
    // Style blocks
    /<style[^>]*>.*?<\/style>/is,
    // Script blocks
    /<script[^>]*>.*?<\/script>/is,
  ] as RegExp[]
};