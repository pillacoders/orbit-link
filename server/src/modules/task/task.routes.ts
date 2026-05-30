import { Router } from 'express';
import { TaskController } from './task.controller';
import { authMiddleware, adminMiddleware } from '../../middleware/auth';

const router = Router();

router.get('/', authMiddleware, TaskController.getAll);
router.post('/:taskId/complete', authMiddleware, TaskController.complete);
router.post('/discord/verify', authMiddleware, TaskController.verifyDiscord);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, TaskController.create);
router.put('/:id', authMiddleware, adminMiddleware, TaskController.update);
router.delete('/:id', authMiddleware, adminMiddleware, TaskController.delete);

export default router;
