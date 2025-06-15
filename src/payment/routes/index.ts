import { Router } from 'express';
import pricingPlanRoutes from './pricing-plan.routes';
import purchaseOrderRoutes from './purchase-order.routes';

const router = Router();

// 定價方案路由
router.use('/pricing-plans', pricingPlanRoutes);

// 購買訂單路由
router.use('/purchase-orders', purchaseOrderRoutes);

export default router;
