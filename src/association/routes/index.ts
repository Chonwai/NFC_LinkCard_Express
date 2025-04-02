import { Router } from 'express';
import { Container } from 'typedi';
import { authMiddleware } from '../../middleware/auth.middleware';
import { AssociationController } from '../controllers/AssociationController';
import { MemberController } from '../controllers/MemberController';
import { LeadController } from '../controllers/LeadController';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { AffiliationController } from '../controllers/AffiliationController';

const router = Router();

// 獲取控制器實例
const associationController = Container.get(AssociationController);
const memberController = Container.get(MemberController);
const leadController = Container.get(LeadController);
const analyticsController = Container.get(AnalyticsController);
const affiliationController = Container.get(AffiliationController);

// 協會資料管理路由
router.post('/associations', authMiddleware, associationController.createAssociation);
router.get('/associations/:id', associationController.getAssociation);
router.put('/associations/:id', authMiddleware, associationController.updateAssociation);
router.delete('/associations/:id', authMiddleware, associationController.deleteAssociation);

// 會員目錄路由
router.get('/associations/:id/members', memberController.getMembers);
router.post('/associations/:id/members', authMiddleware, memberController.addMember);
router.put('/associations/:id/members/:memberId', authMiddleware, memberController.updateMember);
router.delete('/associations/:id/members/:memberId', authMiddleware, memberController.removeMember);

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

export default router;
