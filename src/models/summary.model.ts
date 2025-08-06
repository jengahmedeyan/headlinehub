import { Article } from "./article.model";

export interface Summary {
  id: string;
  articleId: string;
  summary: string;
  title?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  article: Article;
}