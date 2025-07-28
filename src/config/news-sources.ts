import { NewsSource } from "../models/article.model";

export const newsSources: Record<string, NewsSource> = {
  standard: {
    name: "The Standard Newspaper",
    url: "https://standard.gm",
    selectors: {
      articles: "article, .post-item, .news-item, .entry, .td_module_flex",
      title: "h2 a, h3 a, .entry-title a, .post-title a, h2, h3",
      content: ".tdb-block-inner.td-fix-index > p",
      link: "h2 a, h3 a, .entry-title a, .read-more",
      date: ".date, .post-date, .entry-date, time",
      category: ".category, .post-category, .cat-link",
    },
    followLinkForContent: true,
  },
  thepoint: {
    name: "The Point",
    url: "https://thepoint.gm",
    selectors: {
      articles: ".articles-listing-item",
      link: "h3.articles-listing-title a",
      title: "h1.hero-title",
      date: "p.text-dark",
      content: ".hero-banner-text",
      category: "small",
    },
    followLinkForContent: true,
  },
  foroyaa: {
    name: "Foroyaa Newspaper",
    url: "https://foroyaa.net",
    selectors: {
      articles: "article, .post, .news-post",
      title: "h2 a, h3 a, .entry-title a, h2, h3",
      content: ".entry-content p, .excerpt, .post-excerpt",
      link: "h2 a, h3 a, .entry-title a",
      date: ".date, .post-date, time",
      category: ".category, .post-category",
    },
  },
  fatunetwork: {
    name: "The Fatu Network",
    url: "https://fatunetwork.net",
    selectors: {
      articles: "article, .post, .news-item",
      title: "h2 a, h3 a, .entry-title a, h2, h3",
      content: ".entry-content p, .excerpt, .summary",
      link: "h2 a, h3 a, .entry-title a",
      date: ".date, .post-date, time",
      category: ".category, .cat-link",
    },
  },
  voicegambia: {
    name: "The Voice",
    url: "https://www.voicegambia.com",
    selectors: {
      articles: "article, .post, .news-post",
      title: "h2 a, h3 a, .entry-title a, h2, h3",
      content: ".entry-content p, .excerpt",
      link: "h2 a, h3 a, .entry-title a",
      date: ".date, .post-date, time",
      category: ".category",
    },
  },
  therepublic: {
    name: "The Republic",
    url: "https://therepublic.gm",
    selectors: {
      articles: "article, .post, .news-item",
      title: "h2 a, h3 a, .entry-title a, h2, h3",
      content: ".entry-content p, .excerpt",
      link: "h2 a, h3 a, .entry-title a",
      date: ".date, .post-date, time",
      category: ".category, .post-category",
    },
  },
};
