import { Router } from 'express';
import { getAll, add, toggle, remove } from '../controllers/subredditController.js';

const router = Router();

router.get('/', getAll);
router.post('/', add);
router.patch('/:name', toggle);
router.delete('/:name', remove);

export default router;