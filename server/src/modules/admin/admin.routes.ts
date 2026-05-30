import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authMiddleware, adminMiddleware } from '../../middleware/auth';

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/dashboard', AdminController.getDashboard);
router.get('/users', AdminController.getUsers);
router.post('/users/:id/toggle', AdminController.toggleUser);
router.get('/announcements', AdminController.getAnnouncements);
router.post('/announcements', AdminController.createAnnouncement);
router.delete('/announcements/:id', AdminController.deleteAnnouncement);

// Task verification routes
router.get('/tasks/completions/pending', AdminController.getPendingCompletions);
router.post('/tasks/completions/:id/approve', AdminController.approveCompletion);
router.post('/tasks/completions/:id/reject', AdminController.rejectCompletion);

export default router;
