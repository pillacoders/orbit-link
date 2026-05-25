import { Router } from 'express';
import { PointsController } from './points.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.get('/earnings', authMiddleware, PointsController.getEarnings);
router.get('/history', authMiddleware, PointsController.getHistory);
router.get('/chart', authMiddleware, PointsController.getChart);
router.post('/daily-bonus', authMiddleware, PointsController.claimDailyBonus);
router.get('/daily-bonus/status', authMiddleware, PointsController.getBonusStatus);
router.post('/redeem', authMiddleware, PointsController.redeem);

export default router;
