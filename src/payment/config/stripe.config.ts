import Stripe from 'stripe';

/**
 * Stripe 配置
 * 初始化 Stripe 客戶端實例，支持不同環境配置
 */
class StripeConfig {
    private static instance: Stripe | null = null;

    /**
     * 獲取 Stripe 客戶端實例
     * 使用單例模式確保全局唯一實例
     */
    public static getClient(): Stripe {
        if (!this.instance) {
            const apiKey = process.env.STRIPE_SECRET_KEY;

            if (!apiKey) {
                throw new Error('STRIPE_SECRET_KEY environment variable is required');
            }

            this.instance = new Stripe(apiKey, {
                apiVersion: '2025-05-28.basil', // 使用支持的 API 版本
                typescript: true,
                maxNetworkRetries: 3, // 網絡重試次數
                timeout: 10000, // 10秒超時
                appInfo: {
                    name: 'NFC LinkCard Express',
                    version: '1.0.0',
                },
            });
        }

        return this.instance;
    }

    /**
     * 獲取 Webhook 密鑰
     */
    public static getWebhookSecret(): string {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!secret) {
            throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
        }

        return secret;
    }

    /**
     * 獲取價格配置
     */
    public static getPriceConfig() {
        return {
            currency: process.env.STRIPE_DEFAULT_CURRENCY || 'HKD',
            successUrl: process.env.STRIPE_SUCCESS_URL || 'https://your-domain.com/success',
            cancelUrl: process.env.STRIPE_CANCEL_URL || 'https://your-domain.com/cancel',
        };
    }
}

export { StripeConfig };
