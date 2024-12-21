// import { Router } from 'express';
// import { LinkController } from '../controllers/LinkController';
// import { authMiddleware } from '../middleware/auth.middleware';

// const router = Router();
// const linkController = new LinkController();

// // 所有 link 相關操作都需要認證
// router.use(authMiddleware);

// router.post('/', (req, res, next) => linkController.create(req, res, next));
// router.get('/', (req, res, next) => linkController.getAll(req, res, next));
// router.put('/:id', (req, res, next) => linkController.update(req, res, next));
// router.delete('/:id', (req, res, next) => linkController.delete(req, res, next));
// router.patch('/reorder', (req, res, next) => linkController.reorder(req, res, next));
// router.get('/profile/:profileId', (req, res, next) => linkController.getByProfile(req, res, next));

// export default router;
