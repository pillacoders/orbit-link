import { Router } from 'express';
import { NodeController } from './node.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.post('/register', authMiddleware, NodeController.register);
router.post('/heartbeat', authMiddleware, NodeController.heartbeat);
router.post('/disconnect', authMiddleware, NodeController.disconnect);
router.get('/', authMiddleware, NodeController.getNodes);

export default router;
