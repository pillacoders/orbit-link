import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error('[Error]', err);

  if (err.name === 'ZodError') {
    return ApiResponse.badRequest(res, 'Validation error', err.errors);
  }

  if (err.code === 'P2002') {
    const target = err.meta?.target;
    return ApiResponse.conflict(res, `A record with this ${target} already exists`);
  }

  if (err.code === 'P2025') {
    return ApiResponse.notFound(res, 'Record not found');
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  return ApiResponse.error(res, message, statusCode);
}
