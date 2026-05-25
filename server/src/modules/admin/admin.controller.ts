import { Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middleware/auth';

export class AdminController {
  static async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getDashboardStats();
      return ApiResponse.success(res, stats);
    } catch (error) { next(error); }
  }

  static async getUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;
      const users = await AdminService.getAllUsers(page, limit, search);
      return ApiResponse.success(res, users);
    } catch (error) { next(error); }
  }

  static async toggleUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await AdminService.toggleUserStatus(req.params.id as string);
      return ApiResponse.success(res, user, `User ${user.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) { next(error); }
  }

  static async getAnnouncements(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const announcements = await AdminService.getAnnouncements();
      return ApiResponse.success(res, announcements);
    } catch (error) { next(error); }
  }

  static async createAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const announcement = await AdminService.createAnnouncement(req.body);
      return ApiResponse.created(res, announcement);
    } catch (error) { next(error); }
  }

  static async deleteAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await AdminService.deleteAnnouncement(req.params.id as string);
      return ApiResponse.success(res, null, 'Announcement deleted');
    } catch (error) { next(error); }
  }
}
