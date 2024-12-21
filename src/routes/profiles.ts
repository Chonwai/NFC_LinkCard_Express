import { Router } from 'express';
import { ProfileController } from '../controllers/ProfileController';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const profileController = new ProfileController();

// 需要認證的路由
router.use(authMiddleware);
router.post('/', profileController.create);
router.get('/me', profileController.getMyProfiles);
router.put('/:id', profileController.update);
router.delete('/:id', profileController.delete);

// 公開路由（不需要認證）- 放在最後
router.get('/:slug', profileController.getBySlug);

export default router;
