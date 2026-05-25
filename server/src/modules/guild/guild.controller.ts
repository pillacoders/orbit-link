import { Request, Response, NextFunction } from 'express';
import { GuildService } from './guild.service';

export class GuildController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const guild = await GuildService.createGuild(userId, req.body);
      res.status(201).json({ data: guild });
    } catch (err) { next(err); }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const result = await GuildService.listGuilds(page);
      res.json({ data: result });
    } catch (err) { next(err); }
  }

  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const guild = await GuildService.getGuild(req.params.id as string);
      if (!guild) return res.status(404).json({ error: 'Guild not found' });
      res.json({ data: guild });
    } catch (err) { next(err); }
  }

  static async join(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const result = await GuildService.joinGuild(userId, req.params.id as string);
      res.json({ data: result });
    } catch (err) { next(err); }
  }

  static async leave(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const result = await GuildService.leaveGuild(userId, req.params.id as string);
      res.json({ data: result });
    } catch (err) { next(err); }
  }

  static async leaderboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const lb = await GuildService.getLeaderboard();
      res.json({ data: lb });
    } catch (err) { next(err); }
  }
}
