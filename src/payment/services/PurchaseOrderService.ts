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
import { MemberHistoryService } from '../../association/services/MemberHistoryService';
import { EmailService } from '../../services/EmailService';
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
    private readonly memberHistoryService: MemberHistoryService;
    private readonly emailService: EmailService;

    constructor(
        profileBadgeService: ProfileBadgeService,
        memberHistoryService: MemberHistoryService,
        emailService: EmailService,
    ) {
        this.prisma = new PrismaClient();
        this.profileBadgeService = profileBadgeService;
        this.memberHistoryService = memberHistoryService;
        this.emailService = emailService;
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

        // 🆕 智能查找 PurchaseIntentData 記錄
        // 優先使用 email 作為關聯鍵，因為 email 在整個流程中是一致的
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });

        if (!user?.email) {
            throw new Error('用戶信息不完整，無法創建訂單');
        }

        console.log('🔍 開始查找 PurchaseIntentData:', {
            pricingPlanId: data.pricingPlanId,
            associationId: pricingPlan.associationId,
            userEmail: user.email,
            userId,
        });

        // 策略1: 優先通過 email + pricingPlanId + associationId 查找（最可靠）
        let purchaseIntentData = await this.prisma.purchaseIntentData.findFirst({
            where: {
                email: user.email,
                pricingPlanId: data.pricingPlanId,
                associationId: pricingPlan.associationId,
                status: 'PENDING',
                expiresAt: {
                    gt: new Date(), // 未過期
                },
            },
            orderBy: {
                createdAt: 'desc', // 最新的記錄優先
            },
        });

        let searchMethod = 'email_pricingPlan_association';

        // 策略2: 如果沒找到，嘗試通過 userId + pricingPlanId 查找（已關聯用戶）
        if (!purchaseIntentData) {
            purchaseIntentData = await this.prisma.purchaseIntentData.findFirst({
                where: {
                    userId,
                    pricingPlanId: data.pricingPlanId,
                    status: 'PENDING',
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            searchMethod = 'userId_pricingPlan';
        }

        // 🆕 如果找到記錄但 userId 為空，關聯到當前用戶
        if (purchaseIntentData && !purchaseIntentData.userId) {
            purchaseIntentData = await this.prisma.purchaseIntentData.update({
                where: { id: purchaseIntentData.id },
                data: { userId },
            });
            console.log('✅ 已將 PurchaseIntentData 關聯到用戶:', {
                intentDataId: purchaseIntentData.id,
                userId,
                email: user.email,
            });
        }

        console.log('🔍 查找 PurchaseIntentData 結果:', {
            found: !!purchaseIntentData,
            intentDataId: purchaseIntentData?.id,
            searchMethod,
            userEmail: user.email,
            pricingPlanId: data.pricingPlanId,
        });

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

        // 🆕 如果找到對應的 PurchaseIntentData，建立關聯
        if (purchaseIntentData) {
            await this.prisma.purchaseIntentData.update({
                where: { id: purchaseIntentData.id },
                data: {
                    purchaseOrderId: purchaseOrder.id,
                },
            });
            console.log('✅ 已關聯 PurchaseIntentData 到訂單:', {
                intentDataId: purchaseIntentData.id,
                orderId: purchaseOrder.id,
            });
        } else {
            console.log('⚠️ 未找到對應的 PurchaseIntentData，可能是直接購買流程');
        }

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

            let membershipHistoryData: {
                memberId: string;
                previousStatus: MembershipStatus;
                newStatus: MembershipStatus;
                reason: string;
            };

            if (existingMember) {
                // 更新現有會員記錄
                const previousStatus = existingMember.membershipStatus;

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

                // 準備會員歷史記錄數據（現有會員更新）
                membershipHistoryData = {
                    memberId: existingMember.id,
                    previousStatus: previousStatus,
                    newStatus: MembershipStatus.ACTIVE,
                    reason: `用戶通過付費購買會員資格，訂單號：${order.orderNumber}，金額：${order.currency} ${order.amount}`,
                };
            } else {
                // 創建新的會員記錄
                const newMember = await tx.associationMember.create({
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

                // 準備會員歷史記錄數據（新會員創建）
                membershipHistoryData = {
                    memberId: newMember.id,
                    previousStatus: MembershipStatus.PENDING,
                    newStatus: MembershipStatus.ACTIVE,
                    reason: `用戶通過付費購買成為新會員，訂單號：${order.orderNumber}，金額：${order.currency} ${order.amount}`,
                };
            }

            // 🎯 新增：記錄會員狀態變更歷史
            await tx.membershipHistory.create({
                data: {
                    association_member_id: membershipHistoryData.memberId,
                    previous_status: membershipHistoryData.previousStatus,
                    new_status: membershipHistoryData.newStatus,
                    changed_by: order.userId, // 付費用戶自己
                    reason: membershipHistoryData.reason,
                },
            });

            return updatedOrder;
        });

        // 🎯 新增：處理用戶 Profile 和協會徽章 (在事務外執行以避免複雜性)
        await this.ensureUserProfileAndBadge(order.userId, order.associationId);

        // 🆕 新增：更新相關Lead狀態為已轉換
        await this.updateAssociatedLeadStatus(purchaseOrderId, order.userId, order.associationId);

        // 🎯 新增：發送購買確認郵件
        try {
            await this.sendPurchaseConfirmationEmail(result);
        } catch (emailError) {
            console.error('❌ 發送購買確認郵件失敗:', emailError);
            // 郵件發送失敗不影響主要業務流程
        }

        return result;
    }

    /**
     * 🎯 新增：發送購買確認郵件
     */
    private async sendPurchaseConfirmationEmail(order: any) {
        try {
            // 獲取用戶信息
            const user = await this.prisma.user.findUnique({
                where: { id: order.userId },
                select: {
                    email: true,
                    display_name: true,
                    username: true,
                },
            });

            if (!user) {
                throw new Error('用戶不存在');
            }

            // 獲取協會信息
            const association = await this.prisma.association.findUnique({
                where: { id: order.associationId },
                select: {
                    name: true,
                },
            });

            if (!association) {
                throw new Error('協會不存在');
            }

            // 檢查用戶是否有Profile（用於判斷是否可以創建Profile）
            const userProfile = await this.prisma.profile.findFirst({
                where: { user_id: order.userId, is_default: true },
            });

            // 🎯 修正：從實際的會員記錄中獲取會員等級
            const memberRecord = await this.prisma.associationMember.findUnique({
                where: {
                    associationId_userId: {
                        associationId: order.associationId,
                        userId: order.userId,
                    },
                },
                select: {
                    membershipTier: true,
                },
            });

            // 準備郵件數據
            const purchaseData = {
                userName: user.display_name || user.username,
                associationName: association.name,
                orderNumber: order.orderNumber,
                membershipTier:
                    memberRecord?.membershipTier || order.pricingPlan?.membershipTier || 'STANDARD',
                purchaseDate:
                    order.paidAt?.toLocaleDateString('zh-TW') ||
                    new Date().toLocaleDateString('zh-TW'),
                membershipStartDate:
                    order.membershipStartDate?.toLocaleDateString('zh-TW') ||
                    new Date().toLocaleDateString('zh-TW'),
                membershipEndDate:
                    order.membershipEndDate?.toLocaleDateString('zh-TW') ||
                    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-TW'),
                amount: order.amount.toString(),
                currency: order.currency || 'HKD',
                canCreateProfile: !userProfile, // 沒有Profile的用戶可以創建
                profileCreationUrl: `${process.env.FRONTEND_URL}/payment/purchase-orders/${order.id}/profile-creation-options`,
                dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
                helpCenterUrl: `${process.env.FRONTEND_URL}/help`,
                unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe`,
                privacyPolicyUrl: `${process.env.FRONTEND_URL}/privacy`,
            };

            // 發送確認郵件
            await this.emailService.sendMembershipPurchaseConfirmation(user.email, purchaseData);

            console.log('✅ 購買確認郵件發送成功:', {
                email: user.email,
                orderNumber: order.orderNumber,
                associationName: association.name,
            });
        } catch (error) {
            console.error('❌ 發送購買確認郵件失敗:', error);
            throw error;
        }
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
     * 🎯 主動同步 Stripe 支付狀態（解決 Webhook 時序問題）
     *
     * 當檢測到訂單狀態為 PENDING 但用戶已經跳轉回成功頁面時，
     * 主動查詢 Stripe 的真實狀態並同步到數據庫
     */
    async syncStripePaymentStatus(sessionId: string) {
        try {
            console.log('🔍 開始同步 Stripe 支付狀態:', { sessionId });

            // 1. 查詢 Stripe Session 的真實狀態
            const stripeSession = await this.stripe.checkout.sessions.retrieve(sessionId);

            console.log('📊 Stripe Session 狀態:', {
                sessionId,
                paymentStatus: stripeSession.payment_status,
                status: stripeSession.status,
            });

            // 2. 查找對應的訂單
            const order = await this.getOrderBySessionId(sessionId);

            // 3. 檢查是否需要同步
            if (order.status === 'PENDING' && stripeSession.payment_status === 'paid') {
                console.log('💰 檢測到支付成功但狀態未同步，開始處理...');

                // 4. 手動觸發支付成功邏輯
                const updatedOrder = await this.handlePaymentSuccess(order.id, {
                    sessionId: stripeSession.id,
                    customerId: stripeSession.customer,
                    subscriptionId: stripeSession.subscription,
                    paymentStatus: stripeSession.payment_status,
                    amountTotal: stripeSession.amount_total,
                    currency: stripeSession.currency,
                    syncedAt: new Date().toISOString(),
                    syncReason: 'WEBHOOK_TIMING_ISSUE',
                });

                console.log('✅ 支付狀態同步完成:', {
                    orderId: updatedOrder.id,
                    oldStatus: 'PENDING',
                    newStatus: updatedOrder.status,
                });

                // 5. 重新查詢完整的訂單信息
                return await this.getOrderBySessionId(sessionId);
            } else if (order.status === 'PAID') {
                console.log('ℹ️ 訂單狀態已經是 PAID，無需同步');
                return order;
            } else {
                console.log('ℹ️ Stripe 支付狀態未完成，保持 PENDING 狀態');
                return null;
            }
        } catch (error) {
            console.error('❌ 同步 Stripe 支付狀態失敗:', error);
            throw error;
        }
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

    /**
     * 🆕 更新關聯Lead和PurchaseIntentData狀態為已轉換
     * 在支付成功後調用，將購買意向數據標記為已轉換
     */
    private async updateAssociatedLeadStatus(
        purchaseOrderId: string,
        userId: string,
        associationId: string,
    ) {
        try {
            console.log('🔍 開始更新購買意向數據狀態:', {
                purchaseOrderId,
                userId,
                associationId,
            });

            // 🆕 首先處理 PurchaseIntentData
            let purchaseIntentUpdated = false;
            try {
                // 查找與用戶和協會相關的 PurchaseIntentData
                const purchaseIntentData = await this.prisma.purchaseIntentData.findFirst({
                    where: {
                        userId: userId,
                        associationId: associationId,
                        status: 'PENDING',
                    },
                    orderBy: {
                        createdAt: 'desc', // 獲取最新的記錄
                    },
                });

                if (purchaseIntentData) {
                    // 更新 PurchaseIntentData：關聯訂單和更新狀態
                    await this.prisma.purchaseIntentData.update({
                        where: { id: purchaseIntentData.id },
                        data: {
                            purchaseOrderId: purchaseOrderId,
                            status: 'CONVERTED',
                            convertedAt: new Date(),
                        },
                    });

                    console.log(
                        `✅ PurchaseIntentData已轉換：ID ${purchaseIntentData.id} -> 訂單 ${purchaseOrderId}`,
                    );
                    purchaseIntentUpdated = true;
                } else {
                    console.log('ℹ️ 未找到相關的 PurchaseIntentData');
                }
            } catch (error) {
                console.error('❌ 更新 PurchaseIntentData 失敗:', error);
            }

            // 🔄 然後處理 AssociationLead（保持原有邏輯）
            let associationLeadUpdated = false;
            try {
                // 查找與此訂單和用戶相關的Lead記錄
                const associatedLead = await this.prisma.associationLead.findFirst({
                    where: {
                        purchaseOrderId: purchaseOrderId,
                        userId: userId,
                        associationId: associationId,
                        source: 'PURCHASE_INTENT', // 只更新購買意向Lead
                    },
                });

                if (associatedLead) {
                    // 更新Lead狀態為已轉換
                    await this.prisma.associationLead.update({
                        where: { id: associatedLead.id },
                        data: {
                            status: 'CONVERTED',
                            metadata: {
                                ...((associatedLead.metadata as any) || {}),
                                conversion: {
                                    convertedAt: new Date().toISOString(),
                                    conversionType: 'PAID_MEMBERSHIP',
                                    purchaseOrderId: purchaseOrderId,
                                    amount: null, // 將在後續查詢中填充
                                },
                            },
                        },
                    });

                    console.log(
                        `✅ Lead已轉換：Lead ID ${associatedLead.id} -> 訂單 ${purchaseOrderId}`,
                    );
                    associationLeadUpdated = true;
                } else {
                    // 查找任何與用戶和協會相關的購買意向Lead（作為備用）
                    const fallbackLead = await this.prisma.associationLead.findFirst({
                        where: {
                            userId: userId,
                            associationId: associationId,
                            source: 'PURCHASE_INTENT',
                            status: {
                                in: ['NEW', 'CONTACTED', 'QUALIFIED'], // 未轉換的狀態
                            },
                        },
                        orderBy: {
                            createdAt: 'desc', // 最新的Lead
                        },
                    });

                    if (fallbackLead) {
                        await this.prisma.associationLead.update({
                            where: { id: fallbackLead.id },
                            data: {
                                status: 'CONVERTED',
                                purchaseOrderId: purchaseOrderId,
                                metadata: {
                                    ...((fallbackLead.metadata as any) || {}),
                                    conversion: {
                                        convertedAt: new Date().toISOString(),
                                        conversionType: 'PAID_MEMBERSHIP',
                                        purchaseOrderId: purchaseOrderId,
                                        note: 'Converted via fallback matching (user + association)',
                                    },
                                },
                            },
                        });

                        console.log(
                            `✅ Lead已轉換（備用匹配）：Lead ID ${fallbackLead.id} -> 訂單 ${purchaseOrderId}`,
                        );
                        associationLeadUpdated = true;
                    } else {
                        console.log(
                            `ℹ️ 未找到相關的購買意向Lead：用戶 ${userId}，協會 ${associationId}，訂單 ${purchaseOrderId}`,
                        );
                    }
                }
            } catch (error) {
                console.error('❌ 更新 AssociationLead 狀態失敗:', error);
            }

            // 🎯 結果總結
            console.log('📊 購買意向數據更新結果:', {
                purchaseOrderId,
                purchaseIntentDataUpdated: purchaseIntentUpdated,
                associationLeadUpdated: associationLeadUpdated,
            });
        } catch (error) {
            console.error('❌ 更新購買意向數據狀態失敗:', error);
            // Lead狀態更新失敗不應該影響主要支付流程
        }
    }
}
