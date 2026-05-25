import { Response, NextFunction } from 'express';
import { EpochService } from './epoch.service';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middleware/auth';

export class EpochController {
  static async getActive(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const epoch = await EpochService.getActiveEpoch();
      return ApiResponse.success(res, epoch);
    } catch (error) { next(error); }
  }

  static async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const epochs = await EpochService.getAllEpochs();
      return ApiResponse.success(res, epochs);
    } catch (error) { next(error); }
  }

  static async getUserStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { epochId } = req.params;
      const stats = await EpochService.getUserEpochStats(req.userId!, epochId as string);
      return ApiResponse.success(res, stats);
    } catch (error) { next(error); }
  }

  static async getLeaderboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { epochId } = req.params;
      const leaderboard = await EpochService.getEpochLeaderboard(epochId as string);
      return ApiResponse.success(res, leaderboard);
    } catch (error) { next(error); }
  }

  // Admin
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const epoch = await EpochService.createEpoch({
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      });
      return ApiResponse.created(res, epoch);
    } catch (error) { next(error); }
  }

  static async start(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const epoch = await EpochService.startEpoch(req.params.id as string);
      return ApiResponse.success(res, epoch, 'Epoch started');
    } catch (error) { next(error); }
  }

  static async end(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const epoch = await EpochService.endEpoch(req.params.id as string);
      return ApiResponse.success(res, epoch, 'Epoch ended');
    } catch (error) { next(error); }
  }
}
