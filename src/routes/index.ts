import { Router } from 'express';
import authRoutes from './auth';
// import linkRoutes from './links';
import profileRoutes from './profiles';
// import analyticsRoutes from './analytics';

const router = Router();

router.use('/auth', authRoutes);
// router.use('/links', linkRoutes);
router.use('/profiles', profileRoutes);
// router.use('/analytics', analyticsRoutes);

export default router;
