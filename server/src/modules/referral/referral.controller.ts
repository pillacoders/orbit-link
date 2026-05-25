import { Response, NextFunction } from 'express';
import { ReferralService } from './referral.service';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middleware/auth';

export class ReferralController {
  static async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await ReferralService.getReferralStats(req.userId!);
      return ApiResponse.success(res, stats);
    } catch (error) { next(error); }
  }
}
