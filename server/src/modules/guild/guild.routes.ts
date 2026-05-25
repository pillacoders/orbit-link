import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { GuildController } from './guild.controller';

const router = Router();

router.get('/', GuildController.list);
router.get('/leaderboard', GuildController.leaderboard);
router.get('/:id', GuildController.get);
router.post('/', authMiddleware, GuildController.create);
router.post('/:id/join', authMiddleware, GuildController.join);
router.post('/:id/leave', authMiddleware, GuildController.leave);

export default router;
