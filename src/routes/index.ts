import { Router } from 'express';
import linkRoutes from './links';

const router = Router();

router.use('/links', linkRoutes);

// 之後可以添加更多路由
// router.use('/cards', cardRoutes);
// router.use('/analytics', analyticsRoutes);

export default router;
