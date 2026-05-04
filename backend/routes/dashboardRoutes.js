import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import * as dashboardController from '../controllers/dashboardController.js';

const router = Router();

router.use(authMiddleware);
router.get('/', dashboardController.getDashboard);

export default router;
