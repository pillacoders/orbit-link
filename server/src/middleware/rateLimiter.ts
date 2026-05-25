import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';

// Simple in-memory rate limiter (replace with Redis in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(maxRequests = 100, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = requestCounts.get(ip);

    if (!record || now > record.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return ApiResponse.error(res, 'Too many requests, please try again later', 429);
    }

    record.count++;
    next();
  };
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime) requestCounts.delete(key);
  }
}, 300000);
