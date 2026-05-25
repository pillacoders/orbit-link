import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { signupSchema, loginSchema } from './auth.validators';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middleware/auth';

export class AuthController {
  static async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = signupSchema.parse(req.body);
      const result = await AuthService.signup(validated);
      return ApiResponse.created(res, result, 'Account created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated);
      return ApiResponse.success(res, result, 'Logged in successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.getProfile(req.userId!);
      return ApiResponse.success(res, user);
    } catch (error) {
      next(error);
    }
  }

  static async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { googleId, email, name } = req.body;
      if (!googleId || !email) {
        return ApiResponse.error(res, 'Google ID and email are required', 400);
      }
      const result = await AuthService.googleLogin(googleId, email, name || 'User');
      return ApiResponse.success(res, result, 'Logged in with Google');
    } catch (error) {
      next(error);
    }
  }

  static async walletLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { walletAddress, signature, message } = req.body;
      if (!walletAddress) {
        return ApiResponse.error(res, 'Wallet address is required', 400);
      }
      const result = await AuthService.walletLogin(walletAddress, signature || '', message || '');
      return ApiResponse.success(res, result, 'Logged in with wallet');
    } catch (error) {
      next(error);
    }
  }

  static async linkWallet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { walletAddress, signature, message } = req.body;
      if (!walletAddress || !signature || !message) {
        return ApiResponse.error(res, 'Wallet address, signature, and message are required', 400);
      }
      const result = await AuthService.linkWallet(req.userId!, walletAddress, signature, message);
      return ApiResponse.success(res, result, 'Wallet linked successfully');
    } catch (error) {
      next(error);
    }
  }
}
