import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router = Router();
const authController = new AuthController();

router.post('/register', (req, res, next) => {
    authController.register(req, res).catch(next);
});

router.post('/login', (req, res, next) => {
    authController.login(req, res).catch(next);
});

export default router;
