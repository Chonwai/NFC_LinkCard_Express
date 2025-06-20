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

/**
 * @openapi
 * /api/payment/purchase-orders:
 *   post:
 *     tags:
 *       - Purchase Orders
 *     summary: 創建購買訂單
 *     description: 創建購買訂單和 Stripe 結帳會話
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePurchaseOrderDto'
 *     responses:
 *       200:
 *         description: 購買訂單創建成功
 *       400:
 *         description: 請求無效
 *       401:
 *         description: 未授權
 */
router.post('/', authMiddleware, purchaseOrderController.createPurchaseOrder);

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

/**
 * @openapi
 * /api/payment/purchase-orders/payment-status/{sessionId}:
 *   get:
 *     tags:
 *       - Purchase Orders
 *     summary: 查詢支付狀態（推薦）
 *     description: 根據 Stripe Session ID 查詢支付狀態。這是推薦的標準API路徑。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         description: Stripe Session ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 支付狀態查詢成功
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
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         associationId:
 *                           type: string
 *                           description: 協會ID，用於判斷是否為協會購買
 *                         association:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               description: 協會名稱，用於Profile命名建議
 *                     paymentStatus:
 *                       type: string
 *                       enum: [PENDING, PAID, FAILED, CANCELLED]
 *                       description: 支付狀態
 *       404:
 *         description: 訂單未找到
 */
router.get(
    '/payment-status/:sessionId',
    authMiddleware,
    purchaseOrderController.getPaymentStatusBySessionId,
);

/**
 * @openapi
 * /api/payment/purchase-orders/{orderId}/profile-creation-options:
 *   get:
 *     tags:
 *       - Purchase Orders
 *     summary: 獲取支付後的Profile創建選項
 *     description: 支付成功後，獲取創建協會專屬Profile的選項和建議
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         description: 訂單ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功獲取Profile創建選項
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProfileCreationOptionsResponse'
 *       400:
 *         description: 訂單尚未支付完成
 *       403:
 *         description: 無權訪問此訂單
 *       404:
 *         description: 訂單不存在
 */
router.get(
    '/:orderId/profile-creation-options',
    authMiddleware,
    purchaseOrderController.getProfileCreationOptions,
);

/**
 * @openapi
 * /api/payment/purchase-orders/{orderId}/association-profile:
 *   post:
 *     tags:
 *       - Purchase Orders
 *     summary: 基於支付訂單創建協會專屬Profile
 *     description: 支付成功後，為用戶創建協會專屬Profile並自動添加協會徽章
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         description: 訂單ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAssociationProfileFromOrderDto'
 *     responses:
 *       201:
 *         description: 協會Profile創建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AssociationProfileCreationResponse'
 *       400:
 *         description: 訂單尚未支付完成或驗證失敗
 *       403:
 *         description: 無權訪問此訂單或不是協會成員
 *       404:
 *         description: 訂單不存在
 */
router.post(
    '/:orderId/association-profile',
    authMiddleware,
    purchaseOrderController.createAssociationProfileFromOrder,
);

export default router;
