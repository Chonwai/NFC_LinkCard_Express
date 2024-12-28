import { Router } from 'express';
import authRoutes from './auth';
import profileRoutes from './profiles';
import linkRoutes from './links';
import userRoutes from './users';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profiles', profileRoutes);
router.use('/links', linkRoutes);
router.use('/users', userRoutes);

export default router;
