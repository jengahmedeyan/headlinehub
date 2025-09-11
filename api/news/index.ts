import type { VercelRequest, VercelResponse } from '@vercel/node';
import { NewsController } from '../../src/controllers/news.controller';

const newsController = new NewsController();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mockReq = {
      query: req.query,
      params: {},
      body: req.body
    } as any;

    const mockRes = {
      json: (data: any) => res.json(data),
      status: (code: number) => ({
        json: (data: any) => res.status(code).json(data)
      })
    } as any;

    return await newsController.getAllNews(mockReq, mockRes);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}