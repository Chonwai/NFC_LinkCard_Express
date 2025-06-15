import { Service } from 'typedi';
import { PrismaClient, MembershipTier } from '@prisma/client';
import { StripeConfig } from '../config/stripe.config';
import { CreatePricingPlanDto, UpdatePricingPlanDto } from '../dtos/pricing-plan.dto';
import { ApiError } from '../../types/error.types';

/**
 * 定價方案服務
 * 負責處理定價方案的 CRUD 操作和 Stripe 集成
 */
@Service()
export class PricingPlanService {
    private prisma: PrismaClient;
    private stripe = StripeConfig.getClient();

    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * 獲取協會的所有定價方案
     */
    async getAssociationPricingPlans(associationId: string) {
        return this.prisma.pricingPlan.findMany({
            where: {
                associationId,
                isActive: true,
            },
            orderBy: [{ membershipTier: 'asc' }, { price: 'asc' }],
        });
    }

    /**
     * 根據 ID 獲取定價方案
     */
    async getPricingPlanById(id: string) {
        const plan = await this.prisma.pricingPlan.findUnique({
            where: { id },
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

        if (!plan) {
            throw {
                message: '定價方案不存在',
                code: 'PRICING_PLAN_NOT_FOUND',
                status: 404,
            } as ApiError;
        }

        return plan;
    }

    /**
     * 創建定價方案
     */
    async createPricingPlan(associationId: string, data: CreatePricingPlanDto) {
        // 檢查同一協會和會員等級是否已有定價方案
        const existingPlan = await this.prisma.pricingPlan.findUnique({
            where: {
                associationId_membershipTier: {
                    associationId,
                    membershipTier: data.membershipTier,
                },
            },
        });

        if (existingPlan) {
            throw {
                message: '該會員等級已存在定價方案',
                code: 'PRICING_PLAN_ALREADY_EXISTS',
                status: 400,
            } as ApiError;
        }

        // 獲取協會信息
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
        });

        if (!association) {
            throw {
                message: '協會不存在',
                code: 'ASSOCIATION_NOT_FOUND',
                status: 404,
            } as ApiError;
        }

        // 創建 Stripe 產品
        const stripeProduct = await this.stripe.products.create({
            name: `${association.name} - ${data.displayName}`,
            description: data.description || '',
            metadata: {
                associationId,
                membershipTier: data.membershipTier,
                planName: data.name,
            },
        });

        // 創建 Stripe 價格
        const stripePrice = await this.stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: Math.round(data.price * 100), // 轉換為分
            currency: data.currency || 'hkd',
            recurring: {
                interval: data.billingCycle === 'MONTHLY' ? 'month' : 'year',
            },
            metadata: {
                associationId,
                membershipTier: data.membershipTier,
            },
        });

        // 保存到數據庫
        return this.prisma.pricingPlan.create({
            data: {
                associationId,
                name: data.name,
                displayName: data.displayName,
                description: data.description,
                membershipTier: data.membershipTier,
                price: data.price,
                currency: data.currency || 'HKD',
                billingCycle: data.billingCycle || 'YEARLY',
                stripeProductId: stripeProduct.id,
                stripePriceId: stripePrice.id,
            },
        });
    }

    /**
     * 更新定價方案
     */
    async updatePricingPlan(id: string, data: UpdatePricingPlanDto) {
        const existingPlan = await this.getPricingPlanById(id);

        // 如果價格發生變化，需要創建新的 Stripe 價格
        let stripePriceId = existingPlan.stripePriceId;

        if (data.price && data.price !== parseFloat(existingPlan.price.toString())) {
            if (existingPlan.stripeProductId) {
                const newStripePrice = await this.stripe.prices.create({
                    product: existingPlan.stripeProductId,
                    unit_amount: Math.round(data.price * 100),
                    currency: data.currency || existingPlan.currency,
                    recurring: {
                        interval: data.billingCycle === 'MONTHLY' ? 'month' : 'year',
                    },
                    metadata: {
                        associationId: existingPlan.associationId,
                        membershipTier: existingPlan.membershipTier,
                    },
                });

                stripePriceId = newStripePrice.id;

                // 將舊價格設置為不活躍
                if (existingPlan.stripePriceId) {
                    await this.stripe.prices.update(existingPlan.stripePriceId, {
                        active: false,
                    });
                }
            }
        }

        // 更新數據庫
        return this.prisma.pricingPlan.update({
            where: { id },
            data: {
                ...data,
                stripePriceId,
            },
        });
    }

    /**
     * 軟刪除定價方案
     */
    async deletePricingPlan(id: string) {
        const plan = await this.getPricingPlanById(id);

        // 將 Stripe 產品設置為不活躍
        if (plan.stripeProductId) {
            await this.stripe.products.update(plan.stripeProductId, {
                active: false,
            });
        }

        // 軟刪除（設置為不活躍）
        return this.prisma.pricingPlan.update({
            where: { id },
            data: {
                isActive: false,
            },
        });
    }

    /**
     * 根據會員等級獲取定價方案
     */
    async getPricingPlanByTier(associationId: string, membershipTier: MembershipTier) {
        return this.prisma.pricingPlan.findUnique({
            where: {
                associationId_membershipTier: {
                    associationId,
                    membershipTier,
                },
                isActive: true,
            },
        });
    }

    /**
     * 啟用定價方案
     */
    async activatePricingPlan(id: string, userId: string) {
        // 檢查權限
        const plan = await this.prisma.pricingPlan.findFirst({
            where: {
                id,
                association: {
                    members: {
                        some: {
                            userId,
                            role: 'ADMIN',
                        },
                    },
                },
            },
            include: {
                association: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!plan) {
            throw {
                message: '定價方案不存在或無權限',
                code: 'PRICING_PLAN_NOT_FOUND_OR_NO_PERMISSION',
                status: 404,
            } as ApiError;
        }

        // 更新狀態
        const updatedPlan = await this.prisma.pricingPlan.update({
            where: { id },
            data: { isActive: true },
            include: {
                association: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return updatedPlan;
    }

    /**
     * 停用定價方案
     */
    async deactivatePricingPlan(id: string, userId: string) {
        // 檢查權限
        const plan = await this.prisma.pricingPlan.findFirst({
            where: {
                id,
                association: {
                    members: {
                        some: {
                            userId,
                            role: 'ADMIN',
                        },
                    },
                },
            },
            include: {
                association: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!plan) {
            throw {
                message: '定價方案不存在或無權限',
                code: 'PRICING_PLAN_NOT_FOUND_OR_NO_PERMISSION',
                status: 404,
            } as ApiError;
        }

        // 更新狀態
        const updatedPlan = await this.prisma.pricingPlan.update({
            where: { id },
            data: { isActive: false },
            include: {
                association: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return updatedPlan;
    }
}
