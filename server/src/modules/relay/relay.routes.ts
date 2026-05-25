import { Router } from 'express';
import { RelayController } from './relay.controller';

const router = Router();

// Public endpoints — relay stats are public to drive landing page
router.get('/stats', RelayController.getStats);
router.get('/live', RelayController.getLiveStats);
router.get('/feed', RelayController.getFeed);
router.get('/regions', RelayController.getRegions);
router.get('/geo', RelayController.getGeoData);
router.get('/historical', RelayController.getHistorical);

export default router;
