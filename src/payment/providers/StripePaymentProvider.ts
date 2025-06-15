import Stripe from 'stripe';
import {
    PaymentProvider,
    PaymentProviderConfig,
    PaymentProduct,
    PaymentPrice,
    CheckoutSession,
    WebhookEvent,
} from '../interfaces/PaymentProvider.interface';

/**
 * Stripe 支付提供商實現
 */
export class StripePaymentProvider implements PaymentProvider {
    readonly name = 'stripe';
    private stripe: Stripe | null = null;
    private config: PaymentProviderConfig | null = null;

    initialize(config: PaymentProviderConfig): void {
        this.config = config;
        this.stripe = new Stripe(config.apiKey, {
            apiVersion: '2025-05-28.basil',
            timeout: 10000,
        });
    }

    async createProduct(data: {
        name: string;
        description?: string;
        metadata?: Record<string, any>;
    }): Promise<PaymentProduct> {
        if (!this.stripe) {
            throw new Error('Stripe not initialized');
        }

        const product = await this.stripe.products.create({
            name: data.name,
            description: data.description,
            metadata: data.metadata || {},
        });

        return {
            id: product.id,
            name: product.name,
            description: product.description || undefined,
            metadata: product.metadata,
        };
    }

    async createPrice(data: {
        productId: string;
        amount: number;
        currency: string;
        interval: 'month' | 'year' | 'one_time';
        metadata?: Record<string, any>;
    }): Promise<PaymentPrice> {
        if (!this.stripe) {
            throw new Error('Stripe not initialized');
        }

        const priceData: Stripe.PriceCreateParams = {
            product: data.productId,
            unit_amount: Math.round(data.amount * 100), // 轉換為分
            currency: data.currency.toLowerCase(),
            metadata: data.metadata || {},
        };

        // 如果不是一次性付款，添加循環計費
        if (data.interval !== 'one_time') {
            priceData.recurring = {
                interval: data.interval,
            };
        }

        const price = await this.stripe.prices.create(priceData);

        return {
            id: price.id,
            productId: data.productId,
            amount: data.amount,
            currency: data.currency,
            interval: data.interval,
            metadata: price.metadata,
        };
    }

    async updatePriceStatus(priceId: string, active: boolean): Promise<void> {
        if (!this.stripe) {
            throw new Error('Stripe not initialized');
        }

        await this.stripe.prices.update(priceId, {
            active,
        });
    }

    async createCheckoutSession(data: {
        priceId: string;
        successUrl: string;
        cancelUrl: string;
        clientReferenceId?: string;
        metadata?: Record<string, any>;
    }): Promise<CheckoutSession> {
        if (!this.stripe) {
            throw new Error('Stripe not initialized');
        }

        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: data.priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: data.successUrl,
            cancel_url: data.cancelUrl,
            client_reference_id: data.clientReferenceId,
            metadata: data.metadata || {},
        });

        return {
            id: session.id,
            url: session.url!,
            paymentIntentId:
                typeof session.payment_intent === 'string'
                    ? session.payment_intent
                    : session.payment_intent?.id,
            customerId: typeof session.customer === 'string' ? session.customer : undefined,
            subscriptionId:
                typeof session.subscription === 'string' ? session.subscription : undefined,
            metadata: session.metadata || {},
        };
    }

    verifyWebhookSignature(payload: string | Buffer, signature: string): WebhookEvent {
        if (!this.stripe || !this.config) {
            throw new Error('Stripe not initialized');
        }

        const event = this.stripe.webhooks.constructEvent(
            payload,
            signature,
            this.config.webhookSecret,
        );

        return {
            id: event.id,
            type: event.type,
            data: event.data.object,
            metadata: (event.data.object as any).metadata || {},
        };
    }

    parseWebhookEvent(event: WebhookEvent): {
        type: 'payment_succeeded' | 'payment_failed' | 'subscription_cancelled' | 'unknown';
        orderId?: string;
        paymentData?: any;
    } {
        switch (event.type) {
            case 'checkout.session.completed':
                return {
                    type: 'payment_succeeded',
                    orderId: event.metadata?.purchaseOrderId || event.data.client_reference_id,
                    paymentData: {
                        sessionId: event.data.id,
                        customerId: event.data.customer,
                        subscriptionId: event.data.subscription,
                        paymentStatus: event.data.payment_status,
                        amountTotal: event.data.amount_total,
                        currency: event.data.currency,
                    },
                };

            case 'invoice.payment_succeeded':
                return {
                    type: 'payment_succeeded',
                    paymentData: {
                        invoiceId: event.data.id,
                        subscriptionId: event.data.subscription,
                        paymentIntentId: event.data.payment_intent,
                        amountPaid: event.data.amount_paid,
                        currency: event.data.currency,
                    },
                };

            case 'invoice.payment_failed':
                return {
                    type: 'payment_failed',
                    paymentData: {
                        invoiceId: event.data.id,
                        subscriptionId: event.data.subscription,
                        failureReason:
                            event.data.last_finalization_error?.message || 'Payment failed',
                    },
                };

            case 'customer.subscription.deleted':
                return {
                    type: 'subscription_cancelled',
                    paymentData: {
                        subscriptionId: event.data.id,
                        customerId: event.data.customer,
                        canceledAt: event.data.canceled_at,
                    },
                };

            default:
                return {
                    type: 'unknown',
                    paymentData: event.data,
                };
        }
    }
}
