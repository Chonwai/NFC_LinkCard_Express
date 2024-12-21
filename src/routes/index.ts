import { Router } from 'express';
import linkRoutes from './links';
import authRoutes from './auth';

const router = Router();

router.use('/links', linkRoutes);
router.use('/auth', authRoutes);

// 之後可以添加更多路由
// router.use('/cards', cardRoutes);
// router.use('/analytics', analyticsRoutes);

export default router;
