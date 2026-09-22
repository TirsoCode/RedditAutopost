import { Router } from 'express';
import { getDrafts, getPublished, getOne, approve, edit, reject } from '../controllers/postController.js';

const router = Router();

router.get('/drafts', getDrafts);
router.get('/published', getPublished);
router.get('/:id', getOne);
router.post('/:id/approve', approve);
router.patch('/:id/edit', edit);
router.post('/:id/reject', reject);

export default router;