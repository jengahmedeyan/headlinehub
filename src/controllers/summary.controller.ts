import { Request, Response } from "express";
import { SummaryService } from "../services/summary.service";

export class SummaryController {
  private summaryService: SummaryService;

  constructor() {
    this.summaryService = new SummaryService();
  }

  // GET /api/summaries/:articleId
  getSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { articleId } = req.params;

      if (!articleId) {
        res.status(400).json({
          success: false,
          error: "Article ID is required",
        });
        return;
      }

      const summary = await this.summaryService.getSummaryByArticleId(
        articleId
      );

      if (!summary) {
        res.status(404).json({
          success: false,
          error: "No summary found for this article",
        });
        return;
      }

      res.json({
        success: true,
        summary: {
          id: summary.id,
          articleId: summary.articleId,
          summary: summary.summary,
          title: summary.title,
          createdAt: summary.createdAt,
          updatedAt: summary.updatedAt,
        },
      });
    } catch (error) {
      console.error("Error fetching summary:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };

  // POST /api/summaries
  createSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { articleId, summary, title } = req.body;

      if (!articleId || !summary) {
        res.status(400).json({
          success: false,
          error: "Article ID and summary are required",
        });
        return;
      }

      const newSummary = await this.summaryService.createSummary(
        articleId,
        summary,
        title
      );

      res.status(201).json({
        success: true,
        summary: {
          id: newSummary.id,
          articleId: newSummary.articleId,
          summary: newSummary.summary,
          title: newSummary.title,
          createdAt: newSummary.createdAt,
          updatedAt: newSummary.updatedAt,
        },
      });
    } catch (error) {
      console.error("Error creating summary:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };

  // POST /api/summaries/generate
  generateSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { articleId, content, title } = req.body;

      if (!articleId || !content || !title) {
        res.status(400).json({
          success: false,
          error: "Article ID, content, and title are required",
        });
        return;
      }

      const existingSummary = await this.summaryService.getSummaryByArticleId(
        articleId
      );
      if (existingSummary) {
        res.json({
          success: true,
          summary: existingSummary.summary,
          cached: true,
        });
        return;
      }

      const summary = await this.summaryService.generateAndSaveSummary(
        articleId,
        content,
        title
      );

      res.json({
        success: true,
        summary: summary.summary,
        cached: false,
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate summary",
      });
    }
  };

  // DELETE /api/summaries/:articleId
  deleteSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { articleId } = req.params;

      if (!articleId) {
        res.status(400).json({
          success: false,
          error: "Article ID is required",
        });
        return;
      }

      const deleted = await this.summaryService.deleteSummary(articleId);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: "Failed to delete summary",
        });
        return;
      }

      res.json({
        success: true,
        message: "Summary deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting summary:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };

  // POST /api/summaries/bulk
  getBulkSummaries = async (req: Request, res: Response): Promise<void> => {
    try {
      const { articleIds } = req.body;

      if (!articleIds || !Array.isArray(articleIds)) {
        res.status(400).json({
          success: false,
          error: "Article IDs array is required",
        });
        return;
      }

      const summaries = await this.summaryService.getBulkSummaries(articleIds);

      res.json({
        success: true,
        summaries,
      });
    } catch (error) {
      console.error("Error fetching bulk summaries:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };
}
