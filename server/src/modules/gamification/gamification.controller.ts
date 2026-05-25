import { Request, Response, NextFunction } from 'express';
import { GamificationService } from './gamification.service';
import { AchievementService } from './achievement.service';

export class GamificationController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const profile = await GamificationService.getProfile(userId);
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  }

  static async getAllAchievements(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const achievements = await AchievementService.getAllAchievements(userId);
      res.json({ data: achievements });
    } catch (err) {
      next(err);
    }
  }

  static async getMyAchievements(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const achievements = await AchievementService.getUserAchievements(userId);
      res.json({ data: achievements });
    } catch (err) {
      next(err);
    }
  }

  static async setContributionMode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const { mode } = req.body;
      const result = await GamificationService.setContributionMode(userId, mode);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getLevelLeaderboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const leaderboard = await GamificationService.getLevelLeaderboard();
      res.json({ data: leaderboard });
    } catch (err) {
      next(err);
    }
  }
}
