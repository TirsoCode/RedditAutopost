import { Router } from 'express';
import { publish } from '../controllers/authController.js';

const router = Router();

router.post('/:id', publish);

export default router;