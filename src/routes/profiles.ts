// import { Router } from 'express';
// import { ProfileController } from '../controllers/ProfileController';
// import { authMiddleware } from '../middleware/auth.middleware';

// const router = Router();
// const profileController = new ProfileController();

// // 公開路由
// router.get('/:slug', profileController.getBySlug);

// // 需要認證的路由
// router.use(authMiddleware);
// router.post('/', profileController.create);
// router.get('/me', profileController.getMyProfiles);
// router.put('/:id', profileController.update);
// router.delete('/:id', profileController.delete);
// router.patch('/:id/default', profileController.setDefault);

// export default router;
