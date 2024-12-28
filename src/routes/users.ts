import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authMiddleware } from '../middleware/auth.middleware';
import multer from 'multer';

const router = Router();
const userController = new UserController();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('只允許上傳圖片文件'));
        }
        cb(null, true);
    },
});

router.use(authMiddleware);
router.get('/me', userController.getCurrentUser);
router.patch('/me', userController.updateProfile);
router.patch('/me/password', userController.updatePassword);
router.post('/me/avatar', upload.single('avatar') as any, userController.uploadAvatar);

export default router;
