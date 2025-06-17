import { Request, Response } from 'express';
import { Service } from 'typedi';
import { PurchaseOrderService } from '../services/PurchaseOrderService';
import { ApiResponse } from '../../utils/apiResponse';
import { ApiError } from '../../types/error.types';

/**
 * 支付輔助控制器
 * 提供便捷的API端點來滿足前端特定需求
 */
@Service()
export class PaymentHelperController {
    constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

    /**
     * 檢查支付狀態 - 便捷端點
     * GET /api/payment/status/{orderIdOrPaymentIntentId}
     */
    checkPaymentStatus = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            // 作為訂單ID查詢
            const order = await this.purchaseOrderService.getPurchaseOrderById(id);

            return ApiResponse.success(res, {
                orderId: order.id,
                paymentStatus: order.status,
                membershipStatus: order.status === 'PAID' ? 'ACTIVE' : 'PENDING',
                membershipStartDate: order.membershipStartDate,
                membershipEndDate: order.membershipEndDate,
                amount: order.amount,
                currency: order.currency,
                paidAt: order.paidAt,
            });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '查詢支付狀態失敗',
                'PAYMENT_STATUS_CHECK_ERROR',
                apiError.message,
                apiError.status || 404,
            );
        }
    };

    /**
     * 簡化的支付意圖創建 - 便捷端點
     * POST /api/payment/create-intent
     */
    createPaymentIntent = async (req: Request, res: Response) => {
        try {
            const { pricingPlanId, successUrl, cancelUrl } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.unauthorized(res, '用戶未認證', 'USER_NOT_AUTHENTICATED');
            }

            // 使用現有的購買訂單服務
            const result = await this.purchaseOrderService.createPurchaseOrder(userId, {
                pricingPlanId,
                successUrl,
                cancelUrl,
            });

            // 返回前端期望的格式
            return ApiResponse.success(res, {
                paymentIntentId: result.order.id,
                clientSecret: result.checkoutUrl, // Stripe Checkout URL
                orderId: result.order.id,
                amount: result.order.amount,
                currency: result.order.currency,
                status: result.order.status,
                checkoutUrl: result.checkoutUrl,
            });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '創建支付意圖失敗',
                'PAYMENT_INTENT_CREATE_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    /**
     * 獲取用戶在特定協會的會員狀態 - 便捷端點
     * GET /api/payment/membership-status/{associationId}
     * TODO: 實現 getUserMembershipStatus 方法
     */
    getMembershipStatus = async (req: Request, res: Response) => {
        return ApiResponse.error(
            res,
            '此功能暫未實現',
            'FEATURE_NOT_IMPLEMENTED',
            'getUserMembershipStatus method not implemented',
            501,
        );
    };

    /**
     * 處理支付成功的便捷端點
     * POST /api/payment/webhook/payment-succeeded
     */
    handlePaymentSucceeded = async (req: Request, res: Response) => {
        try {
            const { orderId, paymentIntentId } = req.body;

            let order;
            if (orderId) {
                order = await this.purchaseOrderService.getPurchaseOrderById(orderId);
            } else if (paymentIntentId) {
                // TODO: 實現 getOrderByPaymentIntentId 方法
                return ApiResponse.error(
                    res,
                    '通過 PaymentIntent ID 查詢暫未實現',
                    'FEATURE_NOT_IMPLEMENTED',
                    '',
                    501,
                );
            } else {
                return ApiResponse.badRequest(res, '缺少訂單ID或支付意圖ID', 'MISSING_IDENTIFIER');
            }

            // 標記為支付成功
            await this.purchaseOrderService.handlePaymentSuccess(order.id, {
                paymentIntentId,
                status: 'succeeded',
            });

            return ApiResponse.success(res, {
                message: '支付成功處理完成',
                orderId: order.id,
                membershipActivated: true,
            });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '處理支付成功失敗',
                'PAYMENT_SUCCESS_HANDLER_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    /**
     * 處理支付失敗的便捷端點
     * POST /api/payment/webhook/payment-failed
     */
    handlePaymentFailed = async (req: Request, res: Response) => {
        try {
            const { orderId, paymentIntentId, errorMessage } = req.body;

            let order;
            if (orderId) {
                order = await this.purchaseOrderService.getPurchaseOrderById(orderId);
            } else if (paymentIntentId) {
                // TODO: 實現 getOrderByPaymentIntentId 方法
                return ApiResponse.error(
                    res,
                    '通過 PaymentIntent ID 查詢暫未實現',
                    'FEATURE_NOT_IMPLEMENTED',
                    '',
                    501,
                );
            } else {
                return ApiResponse.badRequest(res, '缺少訂單ID或支付意圖ID', 'MISSING_IDENTIFIER');
            }

            // 標記為支付失敗
            await this.purchaseOrderService.handlePaymentFailure(order.id, {
                paymentIntentId,
                status: 'failed',
                errorMessage,
            });

            return ApiResponse.success(res, {
                message: '支付失敗處理完成',
                orderId: order.id,
                errorMessage,
            });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '處理支付失敗失敗',
                'PAYMENT_FAILURE_HANDLER_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };
}
