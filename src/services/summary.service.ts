import { GoogleGenerativeAI } from "@google/generative-ai";
import { Summary } from "../models/summary.model";
import prisma from "../utils/prisma";
import { logger } from "../utils/logger";

export class SummaryService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  createSummary = async (
    articleId: string,
    summary: string,
    title?: string
  ): Promise<Summary> => {
    try {
      const newSummary = await prisma.summary.create({
        data: {
          articleId,
          summary,
          title,
          version: 1,
        },
        include: {
          article: true,
        },
      });

      return newSummary as Summary;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error creating summary:", {
        error: errorMessage,
        articleId,
      });
      throw new Error(`Failed to create summary: ${errorMessage}`);
    }
  };

  getSummariesByArticleId = async (articleId: string): Promise<Summary[]> => {
    try {
      const summaries = await prisma.summary.findMany({
        where: { articleId },
        include: { article: true },
        orderBy: { createdAt: "desc" },
      });

      return summaries as Summary[];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error fetching summaries by article ID:", {
        error: errorMessage,
        articleId,
      });
      throw new Error(`Failed to fetch summaries: ${errorMessage}`);
    }
  };

  getSummaryByArticleId = async (
    articleId: string
  ): Promise<Summary | null> => {
    try {
      const summary = await prisma.summary.findFirst({
        where: { articleId },
        include: { article: true },
        orderBy: { createdAt: "desc" },
      });

      return summary as Summary | null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error fetching summary by article ID:", {
        error: errorMessage,
        articleId,
      });
      throw new Error(`Failed to fetch summary: ${errorMessage}`);
    }
  };

  generateSummary = async (content: string, title: string): Promise<string> => {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

      const prompt = `
Please provide a concise summary of the following news article. Focus on the key points, main facts, and important details. Keep the summary between 4-6 sentences and make it informative yet easy to read.

Title: ${title}

Content: ${content}

Summary:
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      if (!summary || summary.trim().length === 0) {
        throw new Error("Failed to generate summary");
      }

      return summary.trim();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Gemini API error:", { error: errorMessage });
      throw new Error(`Failed to generate summary: ${errorMessage}`);
    }
  };

  generateAndSaveSummary = async (
    articleId: string,
    content: string,
    title: string
  ): Promise<Summary> => {
    try {
      const summaryText = await this.generateSummary(content, title);
      return await this.createSummary(articleId, summaryText, title);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error generating and saving summary:", {
        error: errorMessage,
        articleId,
      });
      throw new Error(`Failed to generate and save summary: ${errorMessage}`);
    }
  };

  deleteSummary = async (articleId: string): Promise<boolean> => {
    try {
      await prisma.summary.deleteMany({
        where: { articleId },
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error deleting summary:", {
        error: errorMessage,
        articleId,
      });
      return false;
    }
  };

  getBulkSummaries = async (
    articleIds: string[]
  ): Promise<Record<string, string>> => {
    try {
      const summaries = await prisma.summary.findMany({
        where: {
          articleId: { in: articleIds },
        },
        select: {
          articleId: true,
          summary: true,
        },
      });

      return summaries.reduce((acc: Record<string, string>, summary: any) => {
        acc[summary.articleId] = summary.summary;
        return acc;
      }, {} as Record<string, string>);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error fetching bulk summaries:", {
        error: errorMessage,
        articleIds,
      });
      return {};
    }
  };
}
