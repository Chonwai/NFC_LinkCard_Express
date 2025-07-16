import { Router } from 'express';
import { Container } from 'typedi';
import { authMiddleware } from '../../middleware/auth.middleware';
import { optionalAuthMiddleware } from '../../middleware/optional-auth.middleware';
import { AssociationController } from '../controllers/AssociationController';
import { MemberController } from '../controllers/MemberController';
import { LeadController } from '../controllers/LeadController';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { AffiliationController } from '../controllers/AffiliationController';
import { MemberInvitationController } from '../controllers/MemberInvitationController';
import { ProfileBadgeController } from '../controllers/ProfileBadgeController';
import { ProfilePrefillController } from '../controllers/ProfilePrefillController';
import { PurchaseIntentController } from '../controllers/PurchaseIntentController';
import associationPricingPlanRoutes from '../../payment/routes/association-pricing-plan.routes';
import multer from 'multer';
import { AssociationPricingPlanController } from '../../payment/controllers/AssociationPricingPlanController';
import { PublicPricingPlanController } from '../../payment/controllers/PublicPricingPlanController';

const router = Router();

// 設置multer - 使用內存存儲
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 限制上傳大小為 5MB
    },
    fileFilter: (req, file, cb) => {
        // 只允許圖片文件
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('只允許上傳圖片文件'));
        }
        cb(null, true);
    },
});

// 獲取控制器實例
const associationController = Container.get(AssociationController);
const memberController = Container.get(MemberController);
const leadController = Container.get(LeadController);
const analyticsController = Container.get(AnalyticsController);
const affiliationController = Container.get(AffiliationController);
const memberInvitationController = Container.get(MemberInvitationController);
const profileBadgeController = Container.get(ProfileBadgeController);
const profilePrefillController = Container.get(ProfilePrefillController);
const purchaseIntentController = Container.get(PurchaseIntentController);
const associationPricingPlanController = Container.get(AssociationPricingPlanController);
const publicPricingPlanController = Container.get(PublicPricingPlanController);

// 協會資料管理路由
router.post('/associations', authMiddleware, associationController.createAssociation);
// 獲取用戶所有協會 (從routes.ts遷移)
router.get('/associations', authMiddleware, associationController.getUserAssociations);
// 特定路由必須放在參數路由之前，否則會匹配到:id
router.get('/associations/by-slug/:slug', associationController.getAssociationBySlug);
router.get('/associations/:id', associationController.getAssociation);
router.put('/associations/:id', authMiddleware, associationController.updateAssociation);
router.patch('/associations/:id', authMiddleware, associationController.updateAssociation);
router.delete('/associations/:id', authMiddleware, associationController.deleteAssociation);

// 🔧 HOTFIX: 恢復原有的上傳路由 (兩個分開的端點)
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

// 協會定價方案管理路由 (RESTful API)
router.use('/associations/:associationId/pricing-plans', associationPricingPlanRoutes);

// 公開端點 - 查看協會的定價方案（無需認證）
router.get(
    '/:associationId/pricing-plans',
    publicPricingPlanController.getPublicAssociationPricingPlans,
);

// 會員目錄路由
router.get('/associations/:id/members', memberController.getMembers);
router.post('/associations/:id/members', authMiddleware, memberController.addMember);
router.put('/associations/:id/members/:memberId', authMiddleware, memberController.updateMember);
router.delete('/associations/:id/members/:memberId', authMiddleware, memberController.removeMember);

// 添加獲取已刪除會員列表路由
router.get('/associations/:id/deleted-members', authMiddleware, memberController.getDeletedMembers);

// 會員狀態管理路由
router.patch(
    '/associations/:id/members/:memberId/status',
    authMiddleware,
    memberController.updateMemberStatus,
);
router.patch(
    '/associations/:id/members/:memberId/suspend',
    authMiddleware,
    memberController.suspendMember,
);
router.patch(
    '/associations/:id/members/:memberId/activate',
    authMiddleware,
    memberController.activateMember,
);
router.patch(
    '/associations/:id/members/:memberId/cancel',
    authMiddleware,
    memberController.cancelMembership,
);
router.post(
    '/associations/:id/members/:memberId/restore',
    authMiddleware,
    memberController.restoreMember,
);
router.post(
    '/associations/:id/members/:memberId/renew',
    authMiddleware,
    memberController.renewMembership,
);

// 會員角色和可見性管理
router.patch(
    '/associations/:id/members/:memberId/role',
    authMiddleware,
    memberController.updateMemberRole,
);
// 🔧 HOTFIX: 修復visibility路由路徑 (恢復正確的路徑結構)
router.patch(
    '/associations/:id/members/:memberId/visibility',
    authMiddleware,
    memberController.updateDirectoryVisibility,
);

// 會員查詢功能
router.get(
    '/associations/:id/members/by-status',
    authMiddleware, // 如果需要權限控制
    memberController.getMembersByStatus,
);
router.get(
    '/associations/members/:memberId/history',
    authMiddleware,
    memberController.getMemberHistory,
);

// 系統管理功能
router.post(
    '/associations/check-expiries',
    authMiddleware,
    memberController.checkExpiredMemberships,
);

// 重新邀請已刪除會員
router.post(
    '/associations/:id/members/:memberId/reinvite',
    authMiddleware,
    memberController.reInviteDeletedMember,
);

// 🆕 批量CSV邀請
router.post(
    '/associations/:id/members/batch-invite',
    authMiddleware,
    upload.single('csvFile') as any,
    memberInvitationController.batchInviteMembers,
);

// 🆕 批量邀請 - 兼容路径（向后兼容）
router.post(
    '/associations/:id/batch-invite',
    authMiddleware,
    upload.single('csvFile') as any,
    memberInvitationController.batchInviteMembers,
);

// 上傳CSV處理
router.post(
    '/associations/:id/process-csv',
    authMiddleware,
    upload.single('csv') as any,
    memberInvitationController.processCsvUpload,
);

// 用戶協會關係
router.get('/my-associations', authMiddleware, memberController.getUserAssociations);
router.get('/managed-associations', authMiddleware, memberController.getManagedAssociations);

// 檢查會員資格
router.get(
    '/associations/:id/check-membership',
    authMiddleware,
    associationController.checkMembership,
);

// 邀請處理路由
router.get('/invitations/:token', memberInvitationController.getInvitationByToken);
// 🔧 HOTFIX: 保持舊的邀請激活端點以確保向後兼容
router.post('/invitations/activate', memberInvitationController.activateInvitedUser);
router.post('/invitations/activate-user', memberInvitationController.activateInvitedUser);
router.get('/invitations', authMiddleware, memberInvitationController.getUserInvitations);
router.post('/invitations/respond', authMiddleware, memberInvitationController.respondToInvitation);
router.post('/invitations/:token/resend', memberInvitationController.resendInvitation);

// 🔧 HOTFIX: 恢復完整的Lead路由 (包括缺失的delete端點)
router.post('/associations/:id/leads', leadController.createLead); // 公開 API
router.get('/associations/:id/leads', authMiddleware, leadController.getLeads);
router.get('/associations/:id/leads/:leadId', authMiddleware, leadController.getLeadById);
router.put('/associations/:id/leads/:leadId', authMiddleware, leadController.updateLead);
router.delete('/associations/:id/leads/:leadId', authMiddleware, leadController.deleteLead); // 🔧 恢復缺失的delete端點
router.patch('/associations/leads/:id/status', authMiddleware, leadController.updateLead);

// 🆕 購買意向數據路由 (購買流程專用)
router.post(
    '/associations/:id/purchase-intents',
    optionalAuthMiddleware,
    purchaseIntentController.createPurchaseIntent,
);
router.get(
    '/associations/:id/purchase-intents/user',
    authMiddleware,
    purchaseIntentController.getUserPurchaseIntents,
);
router.get(
    '/associations/:id/purchase-intents/find-by-email',
    purchaseIntentController.findPurchaseIntentByEmail,
);

// 🆕 Profile預填和Lead關聯功能
router.get(
    '/associations/:associationId/profile-prefill/:userId',
    authMiddleware,
    profilePrefillController.getProfilePrefillOptions,
);
router.post(
    '/associations/:associationId/profiles/with-lead-data',
    authMiddleware,
    profilePrefillController.createProfileWithLeadData,
);
router.get(
    '/associations/:associationId/users/:userId/leads',
    authMiddleware,
    profilePrefillController.getUserLeadsForAssociation,
);

// 分析統計路由
router.post('/analytics/event', analyticsController.trackEvent);
router.get('/associations/:id/analytics', authMiddleware, analyticsController.getAnalytics);
router.get('/associations/:id/analytics/visits', authMiddleware, analyticsController.getVisitStats);
router.get(
    '/associations/:id/analytics/lead-stats',
    authMiddleware,
    analyticsController.getLeadStats,
);
router.get('/associations/:id/analytics/stats', authMiddleware, analyticsController.getStats);
router.get('/associations/:id/analytics/public-stats', analyticsController.getPublicStats);

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

// 個人檔案徽章路由
router.get('/profiles/:id/badges', profileBadgeController.getProfileBadges);
router.post('/profiles/:id/badges', authMiddleware, profileBadgeController.createProfileBadge);
router.put('/profiles/badges/:id', authMiddleware, profileBadgeController.updateProfileBadge);
router.put('/profiles/:id/badges', authMiddleware, profileBadgeController.batchUpdateProfileBadges);
router.delete('/profiles/badges/:id', authMiddleware, profileBadgeController.deleteProfileBadge);

// 新增: 創建協會專屬 Profile 路由
router.post(
    '/associations/:id/profiles',
    authMiddleware,
    associationController.createAssociationProfile,
);

export default router;
