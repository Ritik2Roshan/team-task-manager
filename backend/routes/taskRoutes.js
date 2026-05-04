import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import * as taskController from '../controllers/taskController.js';

const router = Router();

router.use(authMiddleware);

router.get('/overdue', taskController.listOverdue);
router.get('/', taskController.listTasks);
router.post('/', taskController.createTask);
router.get('/:id', taskController.getTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

export default router;
