import { Response } from 'express';

export class ApiResponse {
  static success(res: Response, data: any = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static created(res: Response, data: any = null, message = 'Created successfully') {
    return this.success(res, data, message, 201);
  }

  static error(res: Response, message = 'Internal server error', statusCode = 500, errors: any = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }

  static badRequest(res: Response, message = 'Bad request', errors: any = null) {
    return this.error(res, message, 400, errors);
  }

  static unauthorized(res: Response, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  static notFound(res: Response, message = 'Not found') {
    return this.error(res, message, 404);
  }

  static conflict(res: Response, message = 'Conflict') {
    return this.error(res, message, 409);
  }
}
