import { Response, NextFunction } from 'express';
import { NodeService } from './node.service';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middleware/auth';

export class NodeController {
  static async register(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { type } = req.body;
      const node = await NodeService.registerNode(req.userId!, type || 'EXTENSION', req.headers['user-agent']);
      return ApiResponse.created(res, node, 'Node registered');
    } catch (error) { next(error); }
  }

  static async heartbeat(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { nodeId, connectionQuality, isActive } = req.body;
      const result = await NodeService.heartbeat(nodeId, req.userId!, {
        connectionQuality: connectionQuality || 50,
        isActive: isActive !== false,
      });
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  static async disconnect(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { nodeId } = req.body;
      await NodeService.disconnect(nodeId, req.userId!);
      return ApiResponse.success(res, null, 'Node disconnected');
    } catch (error) { next(error); }
  }

  static async getNodes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await NodeService.getNodeStats(req.userId!);
      return ApiResponse.success(res, stats);
    } catch (error) { next(error); }
  }
}
