import { Request, Response } from 'express';
import { Service } from 'typedi';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { PurchaseOrderService } from '../services/PurchaseOrderService';
import { CreatePurchaseOrderDto } from '../dtos/purchase-order.dto';
import { ApiResponse } from '../../utils/apiResponse';
import { ApiError } from '../../types/error.types';
import prisma from '../../lib/prisma';

/**
 * 購買訂單控制器
 * 處理購買訂單相關的 HTTP 請求
 */
@Service()
export class PurchaseOrderController {
    constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

    /**
     * 創建購買訂單和 Stripe 結帳會話
     */
    createPurchaseOrder = async (req: Request, res: Response) => {
        try {
            console.log('🔍 創建購買訂單請求:', {
                userId: req.user?.id,
                body: req.body,
                timestamp: new Date().toISOString(),
            });

            const createPurchaseOrderDto = plainToClass(CreatePurchaseOrderDto, req.body);
            const errors = await validate(createPurchaseOrderDto);

            if (errors.length > 0) {
                console.error('❌ 驗證錯誤:', errors);
                return ApiResponse.validationError(res, errors);
            }

            const userId = req.user?.id;
            if (!userId) {
                console.error('❌ 用戶未認證');
                return ApiResponse.unauthorized(res, '用戶未認證', 'USER_NOT_AUTHENTICATED');
            }

            console.log('✅ 開始創建購買訂單...');
            const result = await this.purchaseOrderService.createPurchaseOrder(
                userId,
                createPurchaseOrderDto,
            );

            console.log('✅ 購買訂單創建成功:', {
                orderId: result.order.id,
                orderNumber: result.order.orderNumber,
                checkoutUrl: result.checkoutUrl,
            });

            return ApiResponse.success(res, result);
        } catch (error: unknown) {
            console.error('❌ 創建購買訂單失敗:', error);
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '創建購買訂單失敗',
                'PURCHASE_ORDER_CREATE_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    /**
     * 獲取用戶的購買訂單列表
     */
    getUserPurchaseOrders = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.unauthorized(res, '用戶未認證', 'USER_NOT_AUTHENTICATED');
            }

            const orders = await this.purchaseOrderService.getUserPurchaseOrders(userId);
            return ApiResponse.success(res, { orders });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '獲取購買訂單失敗',
                'PURCHASE_ORDER_FETCH_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    /**
     * 根據 ID 獲取購買訂單
     */
    getPurchaseOrderById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const order = await this.purchaseOrderService.getPurchaseOrderById(id);
            return ApiResponse.success(res, { order });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '獲取購買訂單失敗',
                'PURCHASE_ORDER_FETCH_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    /**
     * 通過 Session ID 查詢支付狀態
     */
    getPaymentStatusBySessionId = async (req: Request, res: Response) => {
        try {
            const { sessionId } = req.params;

            console.log('🔍 查詢支付狀態:', {
                sessionId,
                userId: req.user?.id,
                timestamp: new Date().toISOString(),
            });

            if (!sessionId) {
                return ApiResponse.badRequest(res, '缺少 Session ID', 'MISSING_SESSION_ID');
            }

            // 添加詳細的錯誤處理
            let order;
            try {
                order = await this.purchaseOrderService.getOrderBySessionId(sessionId);
                console.log('✅ 找到訂單:', {
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    status: order.status,
                });
            } catch (error) {
                console.error('❌ 未找到訂單:', {
                    sessionId,
                    error: (error as Error).message,
                });

                // 返回明確的錯誤信息
                return ApiResponse.error(
                    res,
                    '找不到對應的支付記錄',
                    'ORDER_NOT_FOUND',
                    `Session ID ${sessionId} 對應的訂單不存在。請確認：
1. 是否成功創建了訂單
2. Session ID 是否正確
3. 訂單是否在當前數據庫中`,
                    404,
                );
            }

            // 查詢會員狀態
            let membership = null;
            if (order.status === 'PAID') {
                try {
                    const associationMember = await prisma.associationMember.findUnique({
                        where: {
                            associationId_userId: {
                                associationId: order.associationId,
                                userId: order.userId,
                            },
                        },
                        include: {
                            association: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true,
                                },
                            },
                        },
                    });

                    if (associationMember) {
                        membership = {
                            id: associationMember.id,
                            tier: associationMember.membershipTier,
                            status: associationMember.membershipStatus,
                            renewalDate: associationMember.renewalDate,
                            association: associationMember.association,
                        };
                    }
                } catch (membershipError) {
                    console.warn('查詢會員狀態失敗:', membershipError);
                }
            }

            return ApiResponse.success(res, {
                order: {
                    id: order.id,
                    orderNumber: order.orderNumber,
                    status: order.status,
                    amount: order.amount,
                    currency: order.currency,
                    paidAt: order.paidAt,
                    membershipStartDate: order.membershipStartDate,
                    membershipEndDate: order.membershipEndDate,
                    pricingPlan: {
                        id: order.pricingPlan.id,
                        displayName: order.pricingPlan.displayName,
                        membershipTier: order.pricingPlan.membershipTier,
                    },
                    association: {
                        id: order.pricingPlan.association.id,
                        name: order.pricingPlan.association.name,
                        slug: order.pricingPlan.association.slug,
                    },
                },
                membership,
                paymentStatus: order.status,
                isProcessed: order.status === 'PAID',
            });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '查詢支付狀態失敗',
                'PAYMENT_STATUS_QUERY_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    /**
     * 處理 Stripe Webhook
     */
    handleStripeWebhook = async (req: Request, res: Response) => {
        try {
            const signature = req.headers['stripe-signature'] as string;
            const payload = req.body;

            if (!signature) {
                return ApiResponse.badRequest(res, '缺少 Stripe 簽名', 'MISSING_STRIPE_SIGNATURE');
            }

            await this.purchaseOrderService.handleStripeWebhook(payload, signature);
            return res.status(200).send('OK');
        } catch (error: unknown) {
            console.error('Stripe Webhook 處理失敗:', error);
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                'Webhook 處理失敗',
                'WEBHOOK_PROCESSING_ERROR',
                apiError.message,
                apiError.status || 400,
            );
        }
    };
}
