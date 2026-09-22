import { Router } from 'express';
import { connect, callback, disconnect } from '../controllers/authController.js';

const router = Router();

// Public OAuth callback (Reddit redirects here)
router.get('/callback', callback);

// Authenticated endpoints
router.post('/reddit/connect', connect);
router.post('/reddit/disconnect', disconnect);

export default router;