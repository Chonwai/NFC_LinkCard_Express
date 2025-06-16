import { Router } from 'express';
import { Container } from 'typedi';
import { PricingPlanController } from '../controllers/PricingPlanController';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const pricingPlanController = Container.get(PricingPlanController);

/**
 * @openapi
 * /api/payment/pricing-plans/association/{associationId}:
 *   get:
 *     tags:
 *       - Pricing Plans
 *     summary: 獲取協會的定價方案列表
 *     description: 獲取指定協會的所有定價方案
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: associationId
 *         required: true
 *         schema:
 *           type: string
 *         description: 協會 ID
 *     responses:
 *       200:
 *         description: 成功獲取定價方案列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     plans:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PricingPlan'
 *       401:
 *         description: 未授權
 *       403:
 *         description: 權限不足
 *       404:
 *         description: 協會不存在
 *       500:
 *         description: 服務器錯誤
 */
router.get(
    '/association/:associationId',
    authMiddleware,
    pricingPlanController.getAssociationPricingPlans,
);

/**
 * @openapi
 * /api/payment/pricing-plans/{id}:
 *   get:
 *     tags:
 *       - Pricing Plans
 *     summary: 根據 ID 獲取定價方案
 *     description: 獲取指定 ID 的定價方案詳情
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 定價方案 ID
 *     responses:
 *       200:
 *         description: 成功獲取定價方案
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     plan:
 *                       $ref: '#/components/schemas/PricingPlan'
 *       401:
 *         description: 未授權
 *       403:
 *         description: 權限不足
 *       404:
 *         description: 定價方案不存在
 *       500:
 *         description: 服務器錯誤
 */
router.get('/:id', authMiddleware, pricingPlanController.getPricingPlanById);

/**
 * @openapi
 * /api/payment/pricing-plans/{associationId}:
 *   post:
 *     tags:
 *       - Pricing Plans
 *     summary: 創建定價方案
 *     description: 為協會創建新的定價方案（已棄用 - 請使用 /api/association/associations/{id}/pricing-plans）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: associationId
 *         required: true
 *         schema:
 *           type: string
 *         description: 協會 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePricingPlanDto'
 *     responses:
 *       201:
 *         description: 定價方案創建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     plan:
 *                       $ref: '#/components/schemas/PricingPlan'
 *       400:
 *         description: 請求數據無效
 *       401:
 *         description: 未授權
 *       403:
 *         description: 權限不足
 *       500:
 *         description: 服務器錯誤
 *     deprecated: true
 */
router.post('/:associationId', authMiddleware, pricingPlanController.createPricingPlan);

// 需要認證的路由

/**
 * @openapi
 * /api/payment/pricing-plans/{id}:
 *   patch:
 *     tags:
 *       - Pricing Plans
 *     summary: 更新定價方案
 *     description: 更新指定 ID 的定價方案
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 定價方案 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePricingPlanDto'
 *     responses:
 *       200:
 *         description: 定價方案更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     plan:
 *                       $ref: '#/components/schemas/PricingPlan'
 *       400:
 *         description: 請求數據無效
 *       401:
 *         description: 未授權
 *       403:
 *         description: 權限不足
 *       404:
 *         description: 定價方案不存在
 *       500:
 *         description: 服務器錯誤
 */
router.patch('/:id', authMiddleware, pricingPlanController.updatePricingPlan);

/**
 * @openapi
 * /api/payment/pricing-plans/{id}:
 *   delete:
 *     tags:
 *       - Pricing Plans
 *     summary: 刪除定價方案
 *     description: 刪除指定 ID 的定價方案
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 定價方案 ID
 *     responses:
 *       200:
 *         description: 定價方案刪除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: 定價方案已刪除
 *       401:
 *         description: 未授權
 *       403:
 *         description: 權限不足
 *       404:
 *         description: 定價方案不存在
 *       500:
 *         description: 服務器錯誤
 */
router.delete('/:id', authMiddleware, pricingPlanController.deletePricingPlan);

/**
 * @openapi
 * /api/payment/pricing-plans/{id}/activate:
 *   patch:
 *     tags:
 *       - Pricing Plans
 *     summary: 啟用定價方案
 *     description: 啟用指定 ID 的定價方案
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 定價方案 ID
 *     responses:
 *       200:
 *         description: 定價方案啟用成功
 *       401:
 *         description: 未授權
 *       403:
 *         description: 權限不足
 *       404:
 *         description: 定價方案不存在
 *       500:
 *         description: 服務器錯誤
 */
router.patch('/:id/activate', pricingPlanController.activatePricingPlan);

/**
 * @openapi
 * /api/payment/pricing-plans/{id}/deactivate:
 *   patch:
 *     tags:
 *       - Pricing Plans
 *     summary: 停用定價方案
 *     description: 停用指定 ID 的定價方案
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 定價方案 ID
 *     responses:
 *       200:
 *         description: 定價方案停用成功
 *       401:
 *         description: 未授權
 *       403:
 *         description: 權限不足
 *       404:
 *         description: 定價方案不存在
 *       500:
 *         description: 服務器錯誤
 */
router.patch('/:id/deactivate', pricingPlanController.deactivatePricingPlan);

export default router;
