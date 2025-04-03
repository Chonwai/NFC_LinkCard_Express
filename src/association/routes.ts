import { Router } from 'express';
import { Container } from 'typedi';
import { AssociationController } from './controllers/AssociationController';
import { MemberInvitationController } from './controllers/MemberInvitationController';
import { MemberController } from './controllers/MemberController';
import { authMiddleware } from '../common/middleware/auth.middleware';
import multer from 'multer';

// 設置multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB限制
});

const router = Router();

// 獲取容器實例
const associationController = Container.get(AssociationController);
const memberInvitationController = Container.get(MemberInvitationController);
const memberController = Container.get(MemberController);

// 協會管理路由
router.post('/', authMiddleware, associationController.createAssociation);
router.get('/', authMiddleware, associationController.getUserAssociations);
router.get('/:id', associationController.getAssociation);
router.put('/:id', authMiddleware, associationController.updateAssociation);
router.delete('/:id', authMiddleware, associationController.deleteAssociation);

// 會員批量邀請
router.post('/:id/batch-invite', authMiddleware, memberInvitationController.batchInviteMembers);
router.post(
    '/:id/process-csv',
    authMiddleware,
    upload.single('csv'),
    memberInvitationController.processCsvUpload,
);

// 邀請處理路由
router.get('/invitations', authMiddleware, memberInvitationController.getUserInvitations);
router.post('/invitations/respond', authMiddleware, memberInvitationController.respondToInvitation);

// 會員管理路由
router.get('/:id/members', authMiddleware, memberController.getMembers);
router.patch('/members/:id/status', authMiddleware, memberController.updateMemberStatus);
router.delete('/members/:id', authMiddleware, memberController.removeMember);
router.patch('/members/:id/role', authMiddleware, memberController.updateMemberRole);
router.patch('/members/:id/visibility', authMiddleware, memberController.updateDirectoryVisibility);

// 用戶協會關係
router.get('/my-associations', authMiddleware, memberController.getUserAssociations);

export default router;
