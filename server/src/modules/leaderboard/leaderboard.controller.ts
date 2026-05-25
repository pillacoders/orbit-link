import { Response, NextFunction } from 'express';
import { LeaderboardService } from './leaderboard.service';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middleware/auth';

export class LeaderboardController {
  static async getGlobal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const leaderboard = await LeaderboardService.getGlobalLeaderboard(page, limit);
      return ApiResponse.success(res, leaderboard);
    } catch (error) { next(error); }
  }

  static async getMyRank(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rank = await LeaderboardService.getUserRank(req.userId!);
      return ApiResponse.success(res, rank);
    } catch (error) { next(error); }
  }
}
