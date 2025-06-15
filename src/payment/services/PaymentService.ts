import { Service } from 'typedi';
import { PaymentProvider, PaymentProviderConfig } from '../interfaces/PaymentProvider.interface';
import { PaymentProviderFactory } from '../factories/PaymentProviderFactory';
import { CreatePricingPlanDto } from '../dtos/pricing-plan.dto';
import { CreatePurchaseOrderDto } from '../dtos/purchase-order.dto';
import prisma from '../../lib/prisma';

/**
 * 通用支付服務
 * 支持多種支付提供商（Stripe、PayPal、Alipay 等）
 */
@Service()
export class PaymentService {
    private getPaymentProvider(providerName: string = 'stripe'): PaymentProvider {
        const config: PaymentProviderConfig = {
            apiKey: process.env.STRIPE_SECRET_KEY!,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
            successUrl: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/success',
            cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/cancel',
            environment: process.env.NODE_ENV === 'production' ? 'live' : 'test',
        };

        return PaymentProviderFactory.getProvider(providerName, config);
    }

    /**
     * 創建定價計劃
     */
    async createPricingPlan(
        data: CreatePricingPlanDto,
        associationId: string,
        providerName: string = 'stripe',
    ) {
        const provider = this.getPaymentProvider(providerName);

        // 創建產品
        const product = await provider.createProduct({
            name: data.name,
            description: data.description,
            metadata: {
                associationId,
                tier: data.membershipTier,
            },
        });

        // 創建價格
        const price = await provider.createPrice({
            productId: product.id,
            amount: data.price,
            currency: data.currency || 'hkd',
            interval: data.billingCycle === 'MONTHLY' ? 'month' : 'year',
            metadata: {
                associationId,
                tier: data.membershipTier,
            },
        });

        // 保存到數據庫
        const pricingPlan = await prisma.pricingPlan.create({
            data: {
                name: data.name,
                displayName: data.displayName,
                description: data.description,
                price: data.price,
                currency: data.currency || 'HKD',
                billingCycle: data.billingCycle || 'YEARLY',
                membershipTier: data.membershipTier,
                isActive: true,
                associationId,
                stripeProductId: product.id,
                stripePriceId: price.id,
            },
        });

        return pricingPlan;
    }

    /**
     * 更新定價計劃狀態
     */
    async updatePricingPlanStatus(id: string, isActive: boolean, providerName: string = 'stripe') {
        const pricingPlan = await prisma.pricingPlan.findUnique({
            where: { id },
        });

        if (!pricingPlan) {
            throw new Error('定價計劃不存在');
        }

        const provider = this.getPaymentProvider(providerName);

        if (pricingPlan.stripePriceId) {
            await provider.updatePriceStatus(pricingPlan.stripePriceId, isActive);
        }

        return await prisma.pricingPlan.update({
            where: { id },
            data: { isActive },
        });
    }

    /**
     * 創建購買訂單和結帳會話
     */
    async createPurchaseOrder(
        data: CreatePurchaseOrderDto,
        userId: string,
        providerName: string = 'stripe',
    ) {
        const pricingPlan = await prisma.pricingPlan.findUnique({
            where: { id: data.pricingPlanId },
        });

        if (!pricingPlan || !pricingPlan.isActive) {
            throw new Error('定價計劃不存在或已停用');
        }

        // 生成訂單號
        const orderNumber = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 創建購買訂單
        const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
                associationId: pricingPlan.associationId,
                userId,
                pricingPlanId: data.pricingPlanId,
                orderNumber,
                amount: pricingPlan.price,
                currency: pricingPlan.currency,
                status: 'PENDING',
            },
        });

        const provider = this.getPaymentProvider(providerName);

        if (!pricingPlan.stripePriceId) {
            throw new Error('定價計劃缺少支付提供商價格 ID');
        }

        // 創建結帳會話
        const checkoutSession = await provider.createCheckoutSession({
            priceId: pricingPlan.stripePriceId,
            successUrl: data.successUrl || 'http://localhost:3000/success',
            cancelUrl: data.cancelUrl || 'http://localhost:3000/cancel',
            clientReferenceId: purchaseOrder.id,
            metadata: {
                purchaseOrderId: purchaseOrder.id,
                userId,
                pricingPlanId: data.pricingPlanId,
            },
        });

        // 更新訂單信息
        const updatedOrder = await prisma.purchaseOrder.update({
            where: { id: purchaseOrder.id },
            data: {
                stripeData: {
                    sessionId: checkoutSession.id,
                    sessionUrl: checkoutSession.url,
                    paymentIntentId: checkoutSession.paymentIntentId,
                    customerId: checkoutSession.customerId,
                    subscriptionId: checkoutSession.subscriptionId,
                },
            },
            include: {
                pricingPlan: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                    },
                },
            },
        });

        return {
            purchaseOrder: updatedOrder,
            checkoutUrl: checkoutSession.url,
        };
    }

    /**
     * 處理 Webhook 事件
     */
    async handleWebhookEvent(
        payload: string | Buffer,
        signature: string,
        providerName: string = 'stripe',
    ) {
        const provider = this.getPaymentProvider(providerName);

        // 驗證 webhook 簽名
        const event = provider.verifyWebhookSignature(payload, signature);

        // 解析事件
        const parsedEvent = provider.parseWebhookEvent(event);

        console.log(`處理 ${providerName} webhook 事件:`, {
            type: parsedEvent.type,
            orderId: parsedEvent.orderId,
        });

        switch (parsedEvent.type) {
            case 'payment_succeeded':
                await this.handlePaymentSucceeded(parsedEvent.orderId, parsedEvent.paymentData);
                break;

            case 'payment_failed':
                await this.handlePaymentFailed(parsedEvent.orderId, parsedEvent.paymentData);
                break;

            case 'subscription_cancelled':
                await this.handleSubscriptionCancelled(parsedEvent.paymentData);
                break;

            default:
                console.log(`未處理的事件類型: ${parsedEvent.type}`);
        }

        return { received: true };
    }

    /**
     * 處理支付成功事件
     */
    private async handlePaymentSucceeded(orderId?: string, paymentData?: any) {
        if (!orderId) {
            console.log('支付成功但沒有訂單 ID');
            return;
        }

        await prisma.$transaction(async (tx) => {
            // 更新訂單狀態
            const order = await tx.purchaseOrder.update({
                where: { id: orderId },
                data: {
                    status: 'PAID',
                    stripeData: {
                        ...(paymentData || {}),
                    },
                    paidAt: new Date(),
                },
                include: {
                    pricingPlan: true,
                },
            });

            // 檢查是否已經是會員
            const existingMember = await tx.associationMember.findFirst({
                where: {
                    userId: order.userId,
                    associationId: order.associationId,
                },
            });

            if (existingMember) {
                // 更新現有會員
                await tx.associationMember.update({
                    where: { id: existingMember.id },
                    data: {
                        membershipStatus: 'ACTIVE',
                        membershipTier: order.pricingPlan.membershipTier,
                        renewalDate: this.calculateExpirationDate(order.pricingPlan.billingCycle),
                        updatedAt: new Date(),
                    },
                });
            } else {
                // 創建新會員
                await tx.associationMember.create({
                    data: {
                        userId: order.userId,
                        associationId: order.associationId,
                        role: 'MEMBER',
                        membershipStatus: 'ACTIVE',
                        membershipTier: order.pricingPlan.membershipTier,
                        renewalDate: this.calculateExpirationDate(order.pricingPlan.billingCycle),
                    },
                });
            }
        });

        console.log(`訂單 ${orderId} 支付成功，會員資格已更新`);
    }

    /**
     * 處理支付失敗事件
     */
    private async handlePaymentFailed(orderId?: string, paymentData?: any) {
        if (!orderId) {
            console.log('支付失敗但沒有訂單 ID');
            return;
        }

        await prisma.purchaseOrder.update({
            where: { id: orderId },
            data: {
                status: 'FAILED',
                stripeData: {
                    ...(paymentData || {}),
                },
            },
        });

        console.log(`訂單 ${orderId} 支付失敗`);
    }

    /**
     * 處理訂閱取消事件
     */
    private async handleSubscriptionCancelled(paymentData?: any) {
        if (!paymentData?.subscriptionId) {
            console.log('訂閱取消但沒有訂閱 ID');
            return;
        }

        // 查找相關的購買訂單
        const orders = await prisma.purchaseOrder.findMany({
            where: {
                stripeData: {
                    path: ['subscriptionId'],
                    equals: paymentData.subscriptionId,
                },
            },
            include: {
                pricingPlan: true,
            },
        });

        for (const order of orders) {
            // 更新會員狀態為已取消
            await prisma.associationMember.updateMany({
                where: {
                    userId: order.userId,
                    associationId: order.associationId,
                },
                data: {
                    membershipStatus: 'EXPIRED',
                    updatedAt: new Date(),
                },
            });
        }

        console.log(`訂閱 ${paymentData.subscriptionId} 已取消，會員狀態已更新`);
    }

    /**
     * 計算會員到期時間
     */
    private calculateExpirationDate(billingCycle: string): Date {
        const now = new Date();
        if (billingCycle === 'MONTHLY') {
            return new Date(now.setMonth(now.getMonth() + 1));
        } else {
            return new Date(now.setFullYear(now.getFullYear() + 1));
        }
    }
}
