import type { VercelRequest, VercelResponse } from '@vercel/node';
import { NewsController } from '../../src/controllers/news.controller';

const newsController = new NewsController();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  await newsController.getAvailableCategories(
    { query: req.query, body: req.body, params: req.query } as any,
    { json: (data: any) => res.json(data), status: (code: number) => ({ json: (data: any) => res.status(code).json(data) }) } as any
  );
}