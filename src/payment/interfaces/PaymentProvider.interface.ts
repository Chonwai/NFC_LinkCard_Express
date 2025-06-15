/**
 * 支付提供商抽象接口
 * 支持多種支付平台（Stripe、PayPal、Alipay 等）
 */

export interface PaymentProduct {
    id: string;
    name: string;
    description?: string;
    metadata?: Record<string, any>;
}

export interface PaymentPrice {
    id: string;
    productId: string;
    amount: number;
    currency: string;
    interval: 'month' | 'year' | 'one_time';
    metadata?: Record<string, any>;
}

export interface CheckoutSession {
    id: string;
    url: string;
    paymentIntentId?: string;
    customerId?: string;
    subscriptionId?: string;
    metadata?: Record<string, any>;
}

export interface WebhookEvent {
    id: string;
    type: string;
    data: any;
    metadata?: Record<string, any>;
}

export interface PaymentProviderConfig {
    apiKey: string;
    webhookSecret: string;
    successUrl: string;
    cancelUrl: string;
    environment: 'test' | 'live';
}

/**
 * 支付提供商接口
 */
export interface PaymentProvider {
    /**
     * 提供商名稱
     */
    readonly name: string;

    /**
     * 初始化配置
     */
    initialize(config: PaymentProviderConfig): void;

    /**
     * 創建產品
     */
    createProduct(data: {
        name: string;
        description?: string;
        metadata?: Record<string, any>;
    }): Promise<PaymentProduct>;

    /**
     * 創建價格
     */
    createPrice(data: {
        productId: string;
        amount: number;
        currency: string;
        interval: 'month' | 'year' | 'one_time';
        metadata?: Record<string, any>;
    }): Promise<PaymentPrice>;

    /**
     * 更新價格狀態
     */
    updatePriceStatus(priceId: string, active: boolean): Promise<void>;

    /**
     * 創建結帳會話
     */
    createCheckoutSession(data: {
        priceId: string;
        successUrl: string;
        cancelUrl: string;
        clientReferenceId?: string;
        metadata?: Record<string, any>;
    }): Promise<CheckoutSession>;

    /**
     * 驗證 Webhook 簽名
     */
    verifyWebhookSignature(payload: string | Buffer, signature: string): WebhookEvent;

    /**
     * 處理 Webhook 事件
     */
    parseWebhookEvent(event: WebhookEvent): {
        type: 'payment_succeeded' | 'payment_failed' | 'subscription_cancelled' | 'unknown';
        orderId?: string;
        paymentData?: any;
    };
}
