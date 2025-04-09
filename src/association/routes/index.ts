import { Router } from 'express';
import { Container } from 'typedi';
import { authMiddleware } from '../../middleware/auth.middleware';
import { AssociationController } from '../controllers/AssociationController';
import { MemberController } from '../controllers/MemberController';
import { LeadController } from '../controllers/LeadController';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { AffiliationController } from '../controllers/AffiliationController';
import { MemberInvitationController } from '../controllers/MemberInvitationController';
import { ProfileBadgeController } from '../controllers/ProfileBadgeController';
import multer from 'multer';

const router = Router();

// 設置multer - 使用內存存儲
const upload = multer({ storage: multer.memoryStorage() });

// 獲取控制器實例
const associationController = Container.get(AssociationController);
const memberController = Container.get(MemberController);
const leadController = Container.get(LeadController);
const analyticsController = Container.get(AnalyticsController);
const affiliationController = Container.get(AffiliationController);
const memberInvitationController = Container.get(MemberInvitationController);
const profileBadgeController = Container.get(ProfileBadgeController);

// 協會資料管理路由
router.post('/associations', authMiddleware, associationController.createAssociation);
// 獲取用戶所有協會 (從routes.ts遷移)
router.get('/associations', authMiddleware, associationController.getUserAssociations);
// 特定路由必須放在參數路由之前，否則會匹配到:id
router.get('/associations/by-slug/:slug', associationController.getAssociationBySlug);
router.get('/associations/:id', associationController.getAssociation);
router.put('/associations/:id', authMiddleware, associationController.updateAssociation);
router.delete('/associations/:id', authMiddleware, associationController.deleteAssociation);

// 協會圖片上傳路由
router.post(
    '/associations/:id/upload-logo',
    authMiddleware,
    upload.single('logo') as any,
    associationController.uploadLogo,
);
router.post(
    '/associations/:id/upload-banner',
    authMiddleware,
    upload.single('banner') as any,
    associationController.uploadBanner,
);

// 會員目錄路由
router.get('/associations/:id/members', memberController.getMembers);
router.post('/associations/:id/members', authMiddleware, memberController.addMember);
router.put('/associations/:id/members/:memberId', authMiddleware, memberController.updateMember);
router.delete('/associations/:id/members/:memberId', authMiddleware, memberController.removeMember);

// 會員狀態管理路由 (從routes.ts遷移)
router.patch('/members/:id/status', authMiddleware, memberController.updateMemberStatus);
router.patch('/members/:id/role', authMiddleware, memberController.updateMemberRole);
router.patch('/members/:id/visibility', authMiddleware, memberController.updateDirectoryVisibility);

// 用戶協會關係 (從routes.ts遷移)
router.get('/my-associations', authMiddleware, memberController.getUserAssociations);

// 邀請處理路由 (從routes.ts遷移)
router.get('/invitations', authMiddleware, memberInvitationController.getUserInvitations);
router.post('/invitations/respond', authMiddleware, memberInvitationController.respondToInvitation);

// 潛在客戶路由
router.post('/associations/:id/leads', leadController.createLead); // 公開 API
router.get('/associations/:id/leads', authMiddleware, leadController.getLeads);
router.get('/associations/:id/leads/:leadId', authMiddleware, leadController.getLeadById);
router.put('/associations/:id/leads/:leadId', authMiddleware, leadController.updateLead);
router.delete('/associations/:id/leads/:leadId', authMiddleware, leadController.deleteLead);

// 分析路由
router.post('/analytics/event', analyticsController.trackEvent);
router.get('/associations/:id/analytics', authMiddleware, analyticsController.getAnalytics);
router.get('/associations/:id/analytics/visits', authMiddleware, analyticsController.getVisitStats);
router.get('/associations/:id/analytics/leads', authMiddleware, analyticsController.getLeadStats);

// 會員關聯路由
router.post(
    '/associations/:id/affiliations',
    authMiddleware,
    affiliationController.createAffiliation,
);
router.put(
    '/associations/:id/affiliations/:affiliationId',
    authMiddleware,
    affiliationController.updateAffiliation,
);
router.get('/user/affiliations', authMiddleware, affiliationController.getUserAffiliations);
router.get('/users/:userId/affiliations/public', affiliationController.getPublicUserAffiliations);

// 批量邀請路由
router.post(
    '/associations/:id/batch-invite',
    authMiddleware,
    memberInvitationController.batchInviteMembers,
);

// 上傳CSV處理 (從routes.ts修正參數)
router.post(
    '/associations/:id/process-csv',
    authMiddleware,
    upload.single('csv') as any, // 使用any類型避免TypeScript兼容性問題
    memberInvitationController.processCsvUpload,
);

// 個人檔案徽章路由
router.get('/profiles/:id/badges', profileBadgeController.getProfileBadges);
router.get(
    '/profiles/:id/available-badges',
    authMiddleware,
    profileBadgeController.getAvailableBadges,
);
router.post('/profiles/:id/badges', authMiddleware, profileBadgeController.createProfileBadge);
router.put('/profiles/badges/:id', authMiddleware, profileBadgeController.updateProfileBadge);
router.put('/profiles/:id/badges', authMiddleware, profileBadgeController.batchUpdateProfileBadges);
router.delete('/profiles/badges/:id', authMiddleware, profileBadgeController.deleteProfileBadge);

export default router;
