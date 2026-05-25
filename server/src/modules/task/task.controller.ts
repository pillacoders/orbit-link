import { Response, NextFunction } from 'express';
import { TaskService } from './task.service';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middleware/auth';

export class TaskController {
  static async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tasks = await TaskService.getAllTasks(req.userId);
      return ApiResponse.success(res, tasks);
    } catch (error) { next(error); }
  }

  static async complete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;
      const result = await TaskService.completeTask(req.userId!, taskId as string);
      return ApiResponse.success(res, result, 'Task completed!');
    } catch (error) { next(error); }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const task = await TaskService.createTask(req.body);
      return ApiResponse.created(res, task);
    } catch (error) { next(error); }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const task = await TaskService.updateTask(req.params.id as string, req.body);
      return ApiResponse.success(res, task);
    } catch (error) { next(error); }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await TaskService.deleteTask(req.params.id as string);
      return ApiResponse.success(res, null, 'Task deactivated');
    } catch (error) { next(error); }
  }
}
