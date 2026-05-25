import { Router } from 'express';
import { ReferralController } from './referral.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.get('/stats', authMiddleware, ReferralController.getStats);

export default router;
