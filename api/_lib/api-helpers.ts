import { VercelRequest, VercelResponse } from '@vercel/node';
import { logger } from '../../src/utils/logger';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export const handleApiError = (res: VercelResponse, error: Error, statusCode = 500): void => {
  logger.error('API error:', {
    error: error.message,
    stack: error.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
};

export const sendApiResponse = <T>(
  res: VercelResponse,
  data: T,
  statusCode = 200
): void => {
  res.status(statusCode).json({
    success: true,
    data,
  });
};

export const sendApiError = (
  res: VercelResponse,
  message: string,
  statusCode = 400
): void => {
  res.status(statusCode).json({
    success: false,
    error: message,
  });
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handleCors = (req: VercelRequest, res: VercelResponse): boolean => {
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
};

export const validateMethod = (
  req: VercelRequest,
  res: VercelResponse,
  allowedMethods: string[]
): boolean => {
  if (!allowedMethods.includes(req.method || '')) {
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: `Method ${req.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
    });
    return false;
  }
  return true;
};

export const withApiWrapper = (
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>,
  allowedMethods: string[] = ['GET']
) => {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      // Handle CORS
      if (handleCors(req, res)) return;

      // Validate method
      if (!validateMethod(req, res, allowedMethods)) return;

      // Execute handler
      await handler(req, res);
    } catch (error) {
      handleApiError(res, error as Error);
    }
  };
};