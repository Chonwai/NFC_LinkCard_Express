import { Service } from 'typedi';
import { PrismaClient } from '@prisma/client';
import { StripeConfig } from '../config/stripe.config';
import { PurchaseOrderService } from './PurchaseOrderService';

/**
 * 支付輪詢服務
 * 作為 Webhook 的替代方案，定期檢查待處理的支付
 *
 * 使用場景：
 * 1. 開發環境無法配置 Webhook
 * 2. Webhook 故障時的備用方案
 * 3. 處理遺漏的支付事件
 */
@Service()
export class PaymentPollingService {
    private prisma: PrismaClient;
    private stripe = StripeConfig.getClient();
    private purchaseOrderService: PurchaseOrderService;
    private pollingInterval: NodeJS.Timeout | null = null;
    private isPolling = false;

    constructor() {
        this.prisma = new PrismaClient();
        this.purchaseOrderService = new PurchaseOrderService();
    }

    /**
     * 開始輪詢檢查支付狀態
     * @param intervalMs 輪詢間隔（毫秒），默認 30 秒
     */
    startPolling(intervalMs: number = 30000) {
        if (this.isPolling) {
            console.log('⚠️ 支付輪詢已在運行中');
            return;
        }

        console.log(`🚀 開始支付狀態輪詢，間隔 ${intervalMs / 1000} 秒`);
        this.isPolling = true;

        this.pollingInterval = setInterval(async () => {
            try {
                await this.checkPendingPayments();
            } catch (error) {
                console.error('💥 輪詢檢查支付失敗:', error);
            }
        }, intervalMs);
    }

    /**
     * 停止輪詢
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            this.isPolling = false;
            console.log('⏹️ 支付輪詢已停止');
        }
    }

    /**
     * 檢查待處理的支付
     */
    async checkPendingPayments() {
        console.log('🔍 檢查待處理的支付...');

        // 查找 24 小時內的待處理訂單
        const pendingOrders = await this.prisma.purchaseOrder.findMany({
            where: {
                status: 'PENDING',
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24小時內
                },
            },
            include: {
                pricingPlan: {
                    include: {
                        association: true,
                    },
                },
            },
        });

        console.log(`📋 找到 ${pendingOrders.length} 個待處理訂單`);

        let processedCount = 0;
        let errorCount = 0;

        for (const order of pendingOrders) {
            try {
                const stripeData = order.stripeData as any;
                if (!stripeData?.sessionId) {
                    console.log(`⚠️ 訂單 ${order.orderNumber} 缺少 sessionId`);
                    continue;
                }

                // 查詢 Stripe 支付狀態
                const session = await this.stripe.checkout.sessions.retrieve(stripeData.sessionId);

                console.log(`🔍 檢查訂單 ${order.orderNumber}:`, {
                    sessionId: session.id,
                    paymentStatus: session.payment_status,
                    orderStatus: order.status,
                });

                if (session.payment_status === 'paid' && order.status !== 'PAID') {
                    console.log(`✅ 發現已支付訂單，開始處理: ${order.orderNumber}`);

                    // 調用支付成功處理邏輯
                    await this.purchaseOrderService.handlePaymentSuccess(order.id, {
                        sessionId: session.id,
                        customerId: session.customer,
                        subscriptionId: session.subscription,
                        paymentStatus: session.payment_status,
                        amountTotal: session.amount_total,
                        currency: session.currency,
                        pollingTriggered: true, // 標記是通過輪詢觸發的
                        processedAt: new Date().toISOString(),
                    });

                    processedCount++;
                    console.log(`🎉 訂單 ${order.orderNumber} 支付處理完成`);
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ 檢查訂單 ${order.orderNumber} 失敗:`, error);
            }
        }

        console.log(`📊 輪詢完成: 處理了 ${processedCount} 個支付，${errorCount} 個錯誤`);
    }

    /**
     * 手動檢查特定訂單的支付狀態
     * @param orderId 訂單 ID
     */
    async checkSpecificOrder(orderId: string) {
        console.log(`🔍 手動檢查訂單: ${orderId}`);

        const order = await this.prisma.purchaseOrder.findUnique({
            where: { id: orderId },
            include: {
                pricingPlan: {
                    include: {
                        association: true,
                    },
                },
            },
        });

        if (!order) {
            throw new Error(`訂單不存在: ${orderId}`);
        }

        const stripeData = order.stripeData as any;
        if (!stripeData?.sessionId) {
            throw new Error(`訂單缺少 Stripe sessionId: ${orderId}`);
        }

        const session = await this.stripe.checkout.sessions.retrieve(stripeData.sessionId);

        console.log(`訂單狀態:`, {
            orderNumber: order.orderNumber,
            orderStatus: order.status,
            stripePaymentStatus: session.payment_status,
            needsProcessing: session.payment_status === 'paid' && order.status !== 'PAID',
        });

        if (session.payment_status === 'paid' && order.status !== 'PAID') {
            console.log(`🚀 處理支付成功: ${order.orderNumber}`);

            await this.purchaseOrderService.handlePaymentSuccess(order.id, {
                sessionId: session.id,
                customerId: session.customer,
                subscriptionId: session.subscription,
                paymentStatus: session.payment_status,
                amountTotal: session.amount_total,
                currency: session.currency,
                manualCheck: true,
                processedAt: new Date().toISOString(),
            });

            console.log(`✅ 訂單 ${order.orderNumber} 處理完成`);
        }

        return {
            order,
            stripeSession: session,
            processed: session.payment_status === 'paid' && order.status !== 'PAID',
        };
    }

    /**
     * 獲取輪詢統計信息
     */
    getPollingStatus() {
        return {
            isPolling: this.isPolling,
            hasInterval: this.pollingInterval !== null,
        };
    }

    /**
     * 清理資源
     */
    async cleanup() {
        this.stopPolling();
        await this.prisma.$disconnect();
    }
}
