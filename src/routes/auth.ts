import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import Container from 'typedi';

const router = Router();
const authController = Container.get(AuthController);

router.post('/register', authController.register);
router.post('/verify-email', authController.verifyEmail);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router;
