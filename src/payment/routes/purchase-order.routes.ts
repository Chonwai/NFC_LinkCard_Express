import { Router } from 'express';
import { Container } from 'typedi';
import { PurchaseOrderController } from '../controllers/PurchaseOrderController';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const purchaseOrderController = Container.get(PurchaseOrderController);

/**
 * @openapi
 * /api/payment/purchase-orders/webhook:
 *   post:
 *     tags:
 *       - Purchase Orders
 *     summary: Stripe Webhook 處理
 *     description: 處理來自 Stripe 的 Webhook 事件
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook 處理成功
 *       400:
 *         description: Webhook 處理失敗
 */
router.post('/webhook', purchaseOrderController.handleStripeWebhook);

// 支付狀態查詢（通過 session_id）
router.get(
    '/status/session/:sessionId',
    authMiddleware,
    purchaseOrderController.getPaymentStatusBySessionId,
);

// 需要認證的路由
router.use(authMiddleware);

/**
 * @openapi
 * /api/payment/purchase-orders:
 *   post:
 *     tags:
 *       - Purchase Orders
 *     summary: 創建購買訂單
 *     description: 創建新的購買訂單並生成 Stripe 結帳會話
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePurchaseOrderDto'
 *     responses:
 *       201:
 *         description: 購買訂單創建成功
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
 *                     order:
 *                       $ref: '#/components/schemas/PurchaseOrder'
 *                     checkoutUrl:
 *                       type: string
 *                       description: Stripe 結帳頁面 URL
 *       400:
 *         description: 請求數據無效
 *       401:
 *         description: 未授權
 *       500:
 *         description: 服務器錯誤
 */
router.post('/', purchaseOrderController.createPurchaseOrder);

/**
 * @openapi
 * /api/payment/purchase-orders:
 *   get:
 *     tags:
 *       - Purchase Orders
 *     summary: 獲取用戶的購買訂單列表
 *     description: 獲取當前用戶的所有購買訂單
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功獲取購買訂單列表
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
 *                     orders:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PurchaseOrder'
 *       401:
 *         description: 未授權
 *       500:
 *         description: 服務器錯誤
 */
router.get('/', purchaseOrderController.getUserPurchaseOrders);

/**
 * @openapi
 * /api/payment/purchase-orders/{id}:
 *   get:
 *     tags:
 *       - Purchase Orders
 *     summary: 根據 ID 獲取購買訂單
 *     description: 獲取指定 ID 的購買訂單詳情
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 購買訂單 ID
 *     responses:
 *       200:
 *         description: 成功獲取購買訂單
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
 *                     order:
 *                       $ref: '#/components/schemas/PurchaseOrder'
 *       401:
 *         description: 未授權
 *       404:
 *         description: 購買訂單不存在
 *       500:
 *         description: 服務器錯誤
 */
router.get('/:id', purchaseOrderController.getPurchaseOrderById);

export default router;
