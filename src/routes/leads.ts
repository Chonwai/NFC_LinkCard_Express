import { Router } from 'express';
import { LeadController } from '../controllers/LeadController';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const leadController = new LeadController();

// 公開路由 - 提交表單
router.post('/profile/:profileId', leadController.create);

// 需要認證的路由
router.use(authMiddleware);
router.get('/profile/:profileId', leadController.getByProfile);

export default router;
