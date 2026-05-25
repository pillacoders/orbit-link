import { Router } from 'express';
import { LeaderboardController } from './leaderboard.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.get('/', authMiddleware, LeaderboardController.getGlobal);
router.get('/me', authMiddleware, LeaderboardController.getMyRank);

export default router;
