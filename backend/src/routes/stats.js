import { Router } from 'express';
import { getOverview } from '../controllers/statsController.js';

const router = Router();

router.get('/overview', getOverview);

export default router;