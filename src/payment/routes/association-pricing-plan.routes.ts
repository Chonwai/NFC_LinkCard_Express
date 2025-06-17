import { Router } from 'express';
import { Container } from 'typedi';
import { AssociationPricingPlanController } from '../controllers/AssociationPricingPlanController';
import { authMiddleware } from '../../middleware/auth.middleware';
import {
    checkAssociationManagePermission,
    checkAssociationAccessPermission,
} from '../middleware/association-permission.middleware';

const router = Router({ mergeParams: true });
const associationPricingPlanController = Container.get(AssociationPricingPlanController);

/**
 * 協會定價方案 RESTful API 路由
 * 所有路由都需要認證，並且自動進行權限檢查
 *
 * 路由格式: /api/associations/{associationId}/pricing-plans
 */

// 獲取協會定價方案（需要是協會成員）
router.get(
    '/',
    authMiddleware,
    checkAssociationAccessPermission,
    associationPricingPlanController.getAssociationPricingPlans,
);

// 獲取單個定價方案（需要是協會成員）
router.get(
    '/:planId',
    authMiddleware,
    checkAssociationAccessPermission,
    associationPricingPlanController.getPricingPlan,
);

// 管理操作 - 需要協會管理權限（擁有者或管理員）

// 創建定價方案
router.post(
    '/',
    authMiddleware,
    checkAssociationManagePermission,
    associationPricingPlanController.createPricingPlan,
);

// 更新定價方案
router.patch(
    '/:planId',
    authMiddleware,
    checkAssociationManagePermission,
    associationPricingPlanController.updatePricingPlan,
);

// 刪除定價方案
router.delete(
    '/:planId',
    authMiddleware,
    checkAssociationManagePermission,
    associationPricingPlanController.deletePricingPlan,
);

// 啟用定價方案
router.patch(
    '/:planId/activate',
    authMiddleware,
    checkAssociationManagePermission,
    associationPricingPlanController.activatePricingPlan,
);

// 停用定價方案
router.patch(
    '/:planId/deactivate',
    authMiddleware,
    checkAssociationManagePermission,
    associationPricingPlanController.deactivatePricingPlan,
);

export default router;
