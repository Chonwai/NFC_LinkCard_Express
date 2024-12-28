import { Router } from 'express';
import { ProfileController } from '../controllers/ProfileController';
import { authMiddleware } from '../middleware/auth.middleware';
import multer from 'multer';

const router = Router();
const profileController = new ProfileController();

// 配置 multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 限制上傳大小為 5MB（我們會在後續處理中壓縮）
    },
    fileFilter: (req, file, cb) => {
        // 只允許圖片文件
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('只允許上傳圖片文件'));
        }
        cb(null, true);
    },
});

// 需要認證的路由
router.get('/me', authMiddleware, profileController.getMyProfiles);

// 公開路由
router.get('/:slug', profileController.getBySlug);

// 其他需要認證的路由
router.use(authMiddleware);
router.post('/', profileController.create);
router.patch('/:id', profileController.update);
router.delete('/:id', profileController.delete);
router.patch('/:id/default', profileController.setDefault);
router.post('/:id/image', upload.single('image') as any, profileController.uploadProfileImage);

export default router;
