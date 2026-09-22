import { Router } from 'express';
import { get as getSettings, update as updateSettings } from '../controllers/settingsController.js';

const router = Router();

router.get('/', getSettings);
router.put('/', updateSettings);

export default router;