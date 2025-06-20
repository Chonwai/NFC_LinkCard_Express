import { Request, Response } from 'express';
import { Service } from 'typedi';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { PurchaseOrderService } from '../services/PurchaseOrderService';
import {
    CreatePurchaseOrderDto,
    CreateAssociationProfileFromOrderDto,
    ProfileCreationOptionsResponseDto,
} from '../dtos/purchase-order.dto';
import { ApiResponse } from '../../utils/apiResponse';
import { ApiError } from '../../types/error.types';
import prisma from '../../lib/prisma';
import { ProfileService } from '../../services/ProfileService';
import { ProfileBadgeService } from '../../association/services/ProfileBadgeService';
import { generateRandomChars } from '../../utils/token';
import { BadgeDisplayMode } from '@prisma/client';

/**
 * 購買訂單控制器
 * 處理購買訂單相關的 HTTP 請求
 */
@Service()
export class PurchaseOrderController {
    constructor(
        private readonly purchaseOrderService: PurchaseOrderService,
        private readonly profileService: ProfileService,
        private readonly profileBadgeService: ProfileBadgeService,
    ) {}

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
                    associationId: order.associationId, // 前端需要的關鍵字段
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

    /**
     * 獲取支付後的Profile創建選項
     * GET /api/payment/purchase-orders/:orderId/profile-creation-options
     */
    getProfileCreationOptions = async (req: Request, res: Response) => {
        try {
            const { orderId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.unauthorized(res, '用戶未認證', 'USER_NOT_AUTHENTICATED');
            }

            // 獲取訂單信息並驗證權限
            const order = await this.purchaseOrderService.getPurchaseOrderById(orderId);

            if (order.userId !== userId) {
                return ApiResponse.forbidden(res, '無權訪問此訂單', 'UNAUTHORIZED_ACCESS');
            }

            if (order.status !== 'PAID') {
                return ApiResponse.badRequest(res, '訂單尚未支付完成', 'ORDER_NOT_PAID');
            }

            // 獲取協會信息
            const association = await prisma.association.findUnique({
                where: { id: order.associationId },
            });

            if (!association) {
                return ApiResponse.notFound(res, '協會不存在', 'ASSOCIATION_NOT_FOUND');
            }

            // 獲取用戶信息
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                return ApiResponse.notFound(res, '用戶不存在', 'USER_NOT_FOUND');
            }

            // 獲取用戶Profile信息
            const userProfiles = await prisma.profile.findMany({
                where: { user_id: userId },
                select: { id: true, is_default: true },
            });

            const hasDefaultProfile = userProfiles.some((p) => p.is_default);
            const totalProfiles = userProfiles.length;

            // 生成建議的Profile名稱和描述
            const suggestedProfileName = `${association.name} - ${
                user.display_name || user.username
            }`;
            const suggestedProfileDescription = `Member of ${association.name}`;

            const responseData: ProfileCreationOptionsResponseDto = {
                order: {
                    id: order.id,
                    orderNumber: order.orderNumber,
                    status: order.status,
                    paidAt: order.paidAt!,
                    membershipStartDate: order.membershipStartDate!,
                    membershipEndDate: order.membershipEndDate!,
                },
                association: {
                    id: association.id,
                    name: association.name,
                    slug: association.slug,
                    logo: association.logo || undefined,
                    description: association.description || undefined,
                },
                user: {
                    id: user.id,
                    username: user.username,
                    displayName: user.display_name || undefined,
                    hasDefaultProfile,
                    totalProfiles,
                },
                canCreateAssociationProfile: true, // 支付成功的用戶總是可以創建
                suggestedProfileName,
                suggestedProfileDescription,
            };

            return ApiResponse.success(res, responseData);
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '獲取Profile創建選項失敗',
                'GET_PROFILE_OPTIONS_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    /**
     * 基於支付訂單創建協會專屬Profile
     * POST /api/payment/purchase-orders/:orderId/association-profile
     */
    createAssociationProfileFromOrder = async (req: Request, res: Response) => {
        try {
            const { orderId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.unauthorized(res, '用戶未認證', 'USER_NOT_AUTHENTICATED');
            }

            const dto = plainToClass(CreateAssociationProfileFromOrderDto, req.body);
            const errors = await validate(dto);
            if (errors.length > 0) {
                return ApiResponse.validationError(res, errors);
            }

            // 獲取訂單信息並驗證權限
            const order = await this.purchaseOrderService.getPurchaseOrderById(orderId);

            if (order.userId !== userId) {
                return ApiResponse.forbidden(res, '無權訪問此訂單', 'UNAUTHORIZED_ACCESS');
            }

            if (order.status !== 'PAID') {
                return ApiResponse.badRequest(res, '訂單尚未支付完成', 'ORDER_NOT_PAID');
            }

            // 檢查用戶是否為協會成員
            const membership = await prisma.associationMember.findUnique({
                where: {
                    associationId_userId: {
                        associationId: order.associationId,
                        userId: userId,
                    },
                },
            });

            if (!membership) {
                return ApiResponse.forbidden(res, '用戶不是協會成員', 'NOT_MEMBER');
            }

            // 獲取協會和用戶信息
            const [association, user] = await Promise.all([
                prisma.association.findUnique({ where: { id: order.associationId } }),
                prisma.user.findUnique({ where: { id: userId } }),
            ]);

            if (!association || !user) {
                return ApiResponse.notFound(res, '協會或用戶不存在', 'RESOURCE_NOT_FOUND');
            }

            // 準備Profile數據
            const profileData = {
                name: dto.name || `${association.name} - ${user.display_name || user.username}`,
                description: dto.description || `Member of ${association.name}`,
                is_public: dto.isPublic !== undefined ? dto.isPublic : true,
                meta: {
                    associationId: association.id,
                    isAssociationProfile: true,
                    createdFromOrderId: orderId,
                },
            };

            // 創建Profile
            const newProfile = await this.profileService.create(profileData, userId);

            // 自動添加協會徽章
            let badgeAdded = false;
            try {
                const badgeDto = {
                    profileId: newProfile.id,
                    associationId: association.id,
                    displayMode: BadgeDisplayMode.FULL,
                    isVisible: true,
                    displayOrder: 0,
                };
                await this.profileBadgeService.createProfileBadge(badgeDto, userId);
                badgeAdded = true;
                console.log(`✅ 已為訂單 ${orderId} 創建協會Profile並添加徽章: ${newProfile.id}`);
            } catch (badgeError) {
                console.error(
                    `創建Profile徽章失敗 (Profile: ${newProfile.id}, Association: ${association.id}):`,
                    badgeError,
                );
                // 即使徽章創建失敗，Profile已創建成功，繼續返回結果
            }

            return ApiResponse.created(res, {
                profile: newProfile,
                association: {
                    id: association.id,
                    name: association.name,
                    slug: association.slug,
                    logo: association.logo,
                },
                badgeAdded,
                message: badgeAdded
                    ? '協會Profile創建成功並已添加徽章'
                    : '協會Profile創建成功，但徽章添加失敗',
            });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '創建協會Profile失敗',
                'CREATE_ASSOCIATION_PROFILE_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };
}
