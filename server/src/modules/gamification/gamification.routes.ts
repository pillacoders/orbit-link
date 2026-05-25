import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { GamificationController } from './gamification.controller';

const router = Router();

router.get('/profile', authMiddleware, GamificationController.getProfile);
router.get('/achievements', authMiddleware, GamificationController.getAllAchievements);
router.get('/achievements/mine', authMiddleware, GamificationController.getMyAchievements);
router.post('/mode', authMiddleware, GamificationController.setContributionMode);
router.get('/leaderboard', GamificationController.getLevelLeaderboard);

export default router;
