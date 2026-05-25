import { Response, NextFunction } from 'express';
import { PointsService } from './points.service';
import { PointsEngine } from './points.engine';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middleware/auth';

export class PointsController {
  static async getEarnings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const overview = await PointsService.getEarningsOverview(req.userId!);
      return ApiResponse.success(res, overview);
    } catch (error) { next(error); }
  }

  static async getHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const history = await PointsService.getPointsHistory(req.userId!, page, limit);
      return ApiResponse.success(res, history);
    } catch (error) { next(error); }
  }

  static async getChart(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const chart = await PointsService.getEarningsChart(req.userId!, days);
      return ApiResponse.success(res, chart);
    } catch (error) { next(error); }
  }

  static async claimDailyBonus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await PointsEngine.claimDailyBonus(req.userId!);
      return ApiResponse.success(res, result, 'Daily bonus claimed!');
    } catch (error) { next(error); }
  }

  static async getBonusStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await PointsEngine.getDailyBonusStatus(req.userId!);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  static async redeem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await PointsService.redeemPoints(req.userId!);
      return ApiResponse.success(res, result, 'Points successfully redeemed on-chain!');
    } catch (error) { next(error); }
  }
}
