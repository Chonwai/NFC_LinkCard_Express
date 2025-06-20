import { Service } from 'typedi';
import { PrismaClient, MembershipStatus, BadgeDisplayMode } from '@prisma/client';
import { nanoid } from 'nanoid';
import { StripeConfig } from '../config/stripe.config';
import {
    CreatePurchaseOrderDto,
    UpdatePurchaseOrderDto,
    CreateAssociationProfileFromOrderDto,
    ProfileCreationOptionsResponseDto,
} from '../dtos/purchase-order.dto';
import { ApiError } from '../../types/error.types';
import { ProfileBadgeService } from '../../association/services/ProfileBadgeService';
import { CreateProfileBadgeDto } from '../../association/dtos/profile-badge.dto';
import * as crypto from 'crypto';
import { generateRandomChars } from '../../utils/token';

/**
 * 購買訂單服務
 * 負責處理購買訂單的業務邏輯和 Stripe 集成
 */
@Service()
export class PurchaseOrderService {
    private prisma: PrismaClient;
    private stripe = StripeConfig.getClient();
    private readonly profileBadgeService: ProfileBadgeService;

    constructor(profileBadgeService: ProfileBadgeService) {
        this.prisma = new PrismaClient();
        this.profileBadgeService = profileBadgeService;
    }

    /**
     * 創建購買訂單和 Stripe Checkout Session
     */
    async createPurchaseOrder(userId: string, data: CreatePurchaseOrderDto) {
        // 獲取定價方案
        const pricingPlan = await this.prisma.pricingPlan.findUnique({
            where: { id: data.pricingPlanId },
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

        if (!pricingPlan || !pricingPlan.isActive) {
            throw {
                message: '定價方案不存在或已停用',
                code: 'PRICING_PLAN_NOT_FOUND',
                status: 404,
            } as ApiError;
        }

        // 檢查用戶是否已經是該協會的會員
        const existingMember = await this.prisma.associationMember.findUnique({
            where: {
                associationId_userId: {
                    associationId: pricingPlan.associationId,
                    userId,
                },
            },
        });

        if (existingMember && existingMember.membershipStatus === 'ACTIVE') {
            throw {
                message: '您已經是該協會的活躍會員',
                code: 'ALREADY_ACTIVE_MEMBER',
                status: 400,
            } as ApiError;
        }

        // 生成訂單號
        const orderNumber = `ORDER-${nanoid(10)}`;

        // 創建購買訂單
        const purchaseOrder = await this.prisma.purchaseOrder.create({
            data: {
                associationId: pricingPlan.associationId,
                userId,
                pricingPlanId: data.pricingPlanId,
                orderNumber,
                amount: pricingPlan.price,
                currency: data.currency || pricingPlan.currency,
                status: 'PENDING',
            },
        });

        // 創建 Stripe Checkout Session
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: pricingPlan.stripePriceId!,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: data.successUrl || StripeConfig.getPriceConfig().successUrl,
            cancel_url: data.cancelUrl || StripeConfig.getPriceConfig().cancelUrl,
            client_reference_id: purchaseOrder.id,
            metadata: {
                purchaseOrderId: purchaseOrder.id,
                associationId: pricingPlan.associationId,
                userId,
                membershipTier: pricingPlan.membershipTier,
            },
        });

        // 更新訂單，保存 Stripe 數據
        const updatedOrder = await this.prisma.purchaseOrder.update({
            where: { id: purchaseOrder.id },
            data: {
                stripeData: {
                    sessionId: session.id,
                    sessionUrl: session.url,
                    paymentIntentId:
                        typeof session.payment_intent === 'string'
                            ? session.payment_intent
                            : session.payment_intent?.id || null,
                },
            },
            include: {
                pricingPlan: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true,
                        membershipTier: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        display_name: true,
                    },
                },
            },
        });

        return {
            order: updatedOrder,
            checkoutUrl: session.url,
        };
    }

    /**
     * 根據 ID 獲取購買訂單
     */
    async getPurchaseOrderById(id: string) {
        const order = await this.prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                pricingPlan: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true,
                        membershipTier: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        display_name: true,
                    },
                },
                association: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        });

        if (!order) {
            throw {
                message: '購買訂單不存在',
                code: 'PURCHASE_ORDER_NOT_FOUND',
                status: 404,
            } as ApiError;
        }

        return order;
    }

    /**
     * 通過 Stripe Session ID 獲取購買訂單
     */
    async getOrderBySessionId(sessionId: string) {
        const order = await this.prisma.purchaseOrder.findFirst({
            where: {
                stripeData: {
                    path: ['sessionId'],
                    equals: sessionId,
                },
            },
            include: {
                pricingPlan: {
                    include: {
                        association: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        display_name: true,
                    },
                },
            },
        });

        if (!order) {
            throw {
                message: '找不到對應的購買訂單',
                code: 'ORDER_NOT_FOUND_BY_SESSION',
                status: 404,
            } as ApiError;
        }

        return order;
    }

    /**
     * 獲取用戶的購買訂單列表
     */
    async getUserPurchaseOrders(userId: string) {
        return this.prisma.purchaseOrder.findMany({
            where: { userId },
            include: {
                pricingPlan: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true,
                        membershipTier: true,
                    },
                },
                association: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * 獲取協會的購買訂單列表
     */
    async getAssociationPurchaseOrders(associationId: string) {
        return this.prisma.purchaseOrder.findMany({
            where: { associationId },
            include: {
                pricingPlan: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true,
                        membershipTier: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        display_name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * 處理支付成功 - 由 Webhook 調用
     */
    async handlePaymentSuccess(purchaseOrderId: string, stripeData: any) {
        const order = await this.getPurchaseOrderById(purchaseOrderId);

        if (order.status === 'PAID') {
            return order; // 已經處理過了
        }

        // 計算會員權益期間
        const now = new Date();
        const membershipStartDate = now;
        const membershipEndDate = new Date(now);

        // 根據計費週期計算結束日期
        if (order.pricingPlan.membershipTier === 'BASIC') {
            membershipEndDate.setFullYear(membershipEndDate.getFullYear() + 1);
        } else {
            membershipEndDate.setFullYear(membershipEndDate.getFullYear() + 1);
        }

        // 使用事務處理支付成功邏輯
        const result = await this.prisma.$transaction(async (tx) => {
            // 更新訂單狀態
            const updatedOrder = await tx.purchaseOrder.update({
                where: { id: purchaseOrderId },
                data: {
                    status: 'PAID',
                    paidAt: now,
                    membershipStartDate,
                    membershipEndDate,
                    stripeData: {
                        ...((order.stripeData as any) || {}),
                        ...stripeData,
                    },
                },
            });

            // 檢查是否已存在會員記錄
            const existingMember = await tx.associationMember.findUnique({
                where: {
                    associationId_userId: {
                        associationId: order.associationId,
                        userId: order.userId,
                    },
                },
            });

            if (existingMember) {
                // 更新現有會員記錄
                await tx.associationMember.update({
                    where: { id: existingMember.id },
                    data: {
                        membershipTier: order.pricingPlan.membershipTier,
                        membershipStatus: MembershipStatus.ACTIVE,
                        renewalDate: membershipEndDate,
                        meta: {
                            ...((existingMember.meta as any) || {}),
                            lastPayment: {
                                orderId: purchaseOrderId,
                                paidAt: now.toISOString(),
                                amount: order.amount.toString(),
                            },
                        },
                    },
                });
            } else {
                // 創建新的會員記錄
                await tx.associationMember.create({
                    data: {
                        associationId: order.associationId,
                        userId: order.userId,
                        role: 'MEMBER',
                        membershipTier: order.pricingPlan.membershipTier,
                        membershipStatus: MembershipStatus.ACTIVE,
                        renewalDate: membershipEndDate,
                        meta: {
                            firstPayment: {
                                orderId: purchaseOrderId,
                                paidAt: now.toISOString(),
                                amount: order.amount.toString(),
                            },
                        },
                    },
                });
            }

            return updatedOrder;
        });

        // 🎯 新增：處理用戶 Profile 和協會徽章 (在事務外執行以避免複雜性)
        await this.ensureUserProfileAndBadge(order.userId, order.associationId);

        return result;
    }

    /**
     * 智能徽章處理：只為現有 Profile 添加徽章，不自動創建 Profile
     *
     * 🎯 新架構說明：
     * - 這個方法只負責為已有Profile用戶自動添加徽章
     * - Profile創建選項通過新的API讓用戶決定：
     *   - GET /api/payment/purchase-orders/:orderId/profile-creation-options
     *   - POST /api/payment/purchase-orders/:orderId/association-profile
     *
     * 避免對已有 Profile 的用戶造成困擾，特別是續費場景
     */
    private async ensureUserProfileAndBadge(userId: string, associationId: string) {
        try {
            // 查找用戶的默認 Profile
            const defaultProfile = await this.prisma.profile.findFirst({
                where: { user_id: userId, is_default: true },
            });

            // 🎯 只有當用戶已有 Profile 時才自動添加徽章
            if (defaultProfile) {
                try {
                    // 檢查徽章是否已存在
                    const existingBadge = await this.prisma.profileBadge.findFirst({
                        where: {
                            profileId: defaultProfile.id,
                            associationId: associationId,
                        },
                    });

                    if (!existingBadge) {
                        // 創建協會徽章
                        const badgeDto: CreateProfileBadgeDto = {
                            profileId: defaultProfile.id,
                            associationId: associationId,
                            userId: userId,
                            displayMode: BadgeDisplayMode.FULL,
                            isVisible: true,
                            displayOrder: 0,
                        };
                        await this.profileBadgeService.createProfileBadge(badgeDto, userId);
                        console.log(
                            `✅ 已為付費用戶 ${userId} 的 Profile ${defaultProfile.id} 自動添加協會徽章`,
                        );
                    } else {
                        console.log(
                            `ℹ️ 付費用戶 ${userId} 的 Profile ${defaultProfile.id} 已存在協會徽章，跳過`,
                        );
                    }
                } catch (badgeError) {
                    console.error(
                        `❌ 為付費用戶 ${userId} 的 Profile ${defaultProfile.id} 添加徽章失敗:`,
                        badgeError,
                    );
                }
            } else {
                console.log(
                    `ℹ️ 付費用戶 ${userId} 沒有默認 Profile，跳過自動徽章添加。用戶可通過前端選擇創建協會專屬 Profile。`,
                );
            }
        } catch (error) {
            console.error(`❌ 處理付費用戶 ${userId} 的 Profile 和徽章時發生錯誤:`, error);
        }
    }

    /**
     * 處理支付失敗
     */
    async handlePaymentFailure(purchaseOrderId: string, stripeData: any) {
        return this.prisma.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: {
                status: 'FAILED',
                stripeData: {
                    ...stripeData,
                },
            },
        });
    }

    /**
     * 更新購買訂單
     */
    async updatePurchaseOrder(id: string, data: UpdatePurchaseOrderDto) {
        const existingOrder = await this.getPurchaseOrderById(id);

        return this.prisma.purchaseOrder.update({
            where: { id },
            data,
        });
    }

    /**
     * 處理 Stripe Webhook
     */
    async handleStripeWebhook(payload: Buffer, signature: string) {
        const webhookSecret = StripeConfig.getWebhookSecret();
        let event;

        try {
            // 驗證 Webhook 簽名
            event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        } catch (err) {
            throw {
                message: `Webhook 簽名驗證失敗: ${(err as Error).message}`,
                code: 'WEBHOOK_SIGNATURE_VERIFICATION_FAILED',
                status: 400,
            } as ApiError;
        }

        // 處理不同類型的事件
        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutSessionCompleted(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await this.handleInvoicePaymentSucceeded(event.data.object);
                break;
            case 'invoice.payment_failed':
                await this.handleInvoicePaymentFailed(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await this.handleSubscriptionDeleted(event.data.object);
                break;
            default:
                console.log(`未處理的事件類型: ${event.type}`);
        }
    }

    /**
     * 處理結帳會話完成事件
     */
    private async handleCheckoutSessionCompleted(session: any) {
        const purchaseOrderId = session.metadata?.purchaseOrderId;

        if (!purchaseOrderId) {
            console.error('結帳會話缺少 purchaseOrderId 元數據');
            return;
        }

        try {
            await this.handlePaymentSuccess(purchaseOrderId, {
                sessionId: session.id,
                customerId: session.customer,
                subscriptionId: session.subscription,
                paymentStatus: session.payment_status,
                amountTotal: session.amount_total,
                currency: session.currency,
            });
        } catch (error) {
            console.error('處理結帳會話完成事件失敗:', error);
        }
    }

    /**
     * 處理發票支付成功事件
     */
    private async handleInvoicePaymentSucceeded(invoice: any) {
        const subscriptionId = invoice.subscription;

        if (!subscriptionId) {
            return;
        }

        try {
            // 查找對應的購買訂單
            const order = await this.prisma.purchaseOrder.findFirst({
                where: {
                    stripeData: {
                        path: ['subscriptionId'],
                        equals: subscriptionId,
                    },
                },
            });

            if (order) {
                await this.handlePaymentSuccess(order.id, {
                    invoiceId: invoice.id,
                    subscriptionId: subscriptionId,
                    paymentIntentId: invoice.payment_intent,
                    amountPaid: invoice.amount_paid,
                    currency: invoice.currency,
                });
            }
        } catch (error) {
            console.error('處理發票支付成功事件失敗:', error);
        }
    }

    /**
     * 處理發票支付失敗事件
     */
    private async handleInvoicePaymentFailed(invoice: any) {
        const subscriptionId = invoice.subscription;

        if (!subscriptionId) {
            return;
        }

        try {
            // 查找對應的購買訂單
            const order = await this.prisma.purchaseOrder.findFirst({
                where: {
                    stripeData: {
                        path: ['subscriptionId'],
                        equals: subscriptionId,
                    },
                },
            });

            if (order) {
                await this.handlePaymentFailure(order.id, {
                    invoiceId: invoice.id,
                    subscriptionId: subscriptionId,
                    failureReason: invoice.last_finalization_error?.message || 'Payment failed',
                });
            }
        } catch (error) {
            console.error('處理發票支付失敗事件失敗:', error);
        }
    }

    /**
     * 處理訂閱刪除事件
     */
    private async handleSubscriptionDeleted(subscription: any) {
        try {
            // 查找對應的購買訂單
            const order = await this.prisma.purchaseOrder.findFirst({
                where: {
                    stripeData: {
                        path: ['subscriptionId'],
                        equals: subscription.id,
                    },
                },
            });

            if (order) {
                // 更新會員狀態為已過期
                await this.prisma.associationMember.updateMany({
                    where: {
                        associationId: order.associationId,
                        userId: order.userId,
                    },
                    data: {
                        membershipStatus: 'EXPIRED',
                    },
                });
            }
        } catch (error) {
            console.error('處理訂閱刪除事件失敗:', error);
        }
    }
}
