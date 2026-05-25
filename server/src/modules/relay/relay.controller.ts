import { Request, Response, NextFunction } from 'express';
import { RelayService } from './relay.service';

export class RelayController {
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await RelayService.getRelayStats();
      res.json({ data: stats });
    } catch (err) {
      next(err);
    }
  }

  static async getLiveStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = RelayService.getLiveStats();
      res.json({ data: stats });
    } catch (err) {
      next(err);
    }
  }

  static async getFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const feed = await RelayService.getRelayFeed(Math.min(limit, 50));
      res.json({ data: feed });
    } catch (err) {
      next(err);
    }
  }

  static async getRegions(_req: Request, res: Response, next: NextFunction) {
    try {
      const regions = await RelayService.getRegionStats();
      res.json({ data: regions });
    } catch (err) {
      next(err);
    }
  }

  static async getGeoData(_req: Request, res: Response, next: NextFunction) {
    try {
      const regions = RelayService.getRegions();
      const stats = await RelayService.getRegionStats();
      res.json({
        data: {
          regions,
          stats,
          liveCounters: RelayService.getLiveStats(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getHistorical(req: Request, res: Response, next: NextFunction) {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const data = await RelayService.getHistoricalStats(Math.min(hours, 168));
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}
