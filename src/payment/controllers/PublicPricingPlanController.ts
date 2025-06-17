import { Request, Response } from 'express';
import { Service } from 'typedi';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../../utils/apiResponse';
import { ApiError } from '../../types/error.types';

/**
 * 公開定價方案控制器
 * 處理無需認證的定價方案查看功能
 */
@Service()
export class PublicPricingPlanController {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * 獲取協會的公開定價方案列表
     * GET /api/association/:associationId/pricing-plans
     *
     * 此端點允許任何人查看公開協會的定價方案
     * 適用於潛在會員瀏覽協會詳情頁面
     */
    getPublicAssociationPricingPlans = async (req: Request, res: Response) => {
        try {
            const { associationId } = req.params;

            // 檢查協會是否存在並且公開
            const association = await this.prisma.association.findUnique({
                where: { id: associationId },
                select: { id: true, name: true, isPublic: true },
            });

            if (!association) {
                return ApiResponse.error(res, '協會不存在', 'ASSOCIATION_NOT_FOUND', null, 404);
            }

            // 檢查協會是否公開
            if (!association.isPublic) {
                return ApiResponse.error(
                    res,
                    '此協會的定價方案不公開',
                    'PRICING_PLANS_NOT_PUBLIC',
                    '只有公開協會的定價方案可以被訪問',
                    403,
                );
            }

            // 獲取活躍的定價方案（隱藏敏感信息）
            const plans = await this.prisma.pricingPlan.findMany({
                where: {
                    associationId,
                    isActive: true,
                },
                select: {
                    id: true,
                    name: true,
                    displayName: true,
                    description: true,
                    membershipTier: true,
                    price: true,
                    currency: true,
                    billingCycle: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    // 隱藏 Stripe 相關敏感信息
                    // stripeProductId: false,
                    // stripePriceId: false,
                },
                orderBy: [{ membershipTier: 'asc' }, { price: 'asc' }],
            });

            return ApiResponse.success(res, {
                plans,
                association: {
                    id: association.id,
                    name: association.name,
                },
            });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '獲取定價方案失敗',
                'PRICING_PLAN_FETCH_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };
}
