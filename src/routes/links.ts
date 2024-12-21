import { Router } from 'express';
import { LinkController } from '../controllers/LinkController';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const linkController = new LinkController();

// 所有 link 相關操作都需要認證
router.use(authMiddleware);

router.post('/', linkController.create);
router.get('/', linkController.getAll);
router.put('/:id', linkController.update);
router.delete('/:id', linkController.delete);
router.patch('/reorder', linkController.reorder);
router.get('/profile/:profileId', linkController.getByProfile);

export default router;
