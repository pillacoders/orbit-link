import { Router } from 'express';
import { EpochController } from './epoch.controller';
import { authMiddleware, adminMiddleware } from '../../middleware/auth';

const router = Router();

router.get('/active', authMiddleware, EpochController.getActive);
router.get('/', authMiddleware, EpochController.getAll);
router.get('/:epochId/stats', authMiddleware, EpochController.getUserStats);
router.get('/:epochId/leaderboard', authMiddleware, EpochController.getLeaderboard);

// Admin
router.post('/', authMiddleware, adminMiddleware, EpochController.create);
router.post('/:id/start', authMiddleware, adminMiddleware, EpochController.start);
router.post('/:id/end', authMiddleware, adminMiddleware, EpochController.end);

export default router;
