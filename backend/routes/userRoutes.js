import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import * as userController from '../controllers/userController.js';

const router = Router();

router.use(authMiddleware);
router.get('/', requireAdmin, userController.listUsers);
router.get('/:id', userController.getUserById);

export default router;
