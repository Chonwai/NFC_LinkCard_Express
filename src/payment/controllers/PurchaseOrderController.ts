import { Request, Response } from 'express';
import { Service } from 'typedi';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { PurchaseOrderService } from '../services/PurchaseOrderService';
import { CreatePurchaseOrderDto } from '../dtos/purchase-order.dto';
import { ApiResponse } from '../../utils/apiResponse';
import { ApiError } from '../../types/error.types';

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
            const createPurchaseOrderDto = plainToClass(CreatePurchaseOrderDto, req.body);
            const errors = await validate(createPurchaseOrderDto);

            if (errors.length > 0) {
                return ApiResponse.validationError(res, errors);
            }

            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.unauthorized(res, '用戶未認證', 'USER_NOT_AUTHENTICATED');
            }

            const result = await this.purchaseOrderService.createPurchaseOrder(
                userId,
                createPurchaseOrderDto,
            );

            return ApiResponse.success(res, result);
        } catch (error: unknown) {
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
