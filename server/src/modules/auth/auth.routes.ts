import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.post('/signup', rateLimiter(10, 60000), AuthController.signup);
router.post('/login', rateLimiter(20, 60000), AuthController.login);
router.post('/google', rateLimiter(20, 60000), AuthController.googleLogin);
router.post('/wallet', rateLimiter(20, 60000), AuthController.walletLogin);
router.post('/wallet/link', authMiddleware, rateLimiter(10, 60000), AuthController.linkWallet);
router.get('/profile', authMiddleware, AuthController.getProfile);

export default router;
