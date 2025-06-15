import { PaymentProvider, PaymentProviderConfig } from '../interfaces/PaymentProvider.interface';
import { StripePaymentProvider } from '../providers/StripePaymentProvider';

/**
 * 支付提供商工廠
 * 根據配置創建不同的支付提供商實例
 */
export class PaymentProviderFactory {
    private static providers: Map<string, PaymentProvider> = new Map();

    /**
     * 創建或獲取支付提供商實例
     */
    static getProvider(providerName: string, config: PaymentProviderConfig): PaymentProvider {
        const key = `${providerName}_${config.apiKey.substring(0, 10)}`;

        if (!this.providers.has(key)) {
            const provider = this.createProvider(providerName);
            provider.initialize(config);
            this.providers.set(key, provider);
        }

        return this.providers.get(key)!;
    }

    /**
     * 創建支付提供商實例
     */
    private static createProvider(providerName: string): PaymentProvider {
        switch (providerName.toLowerCase()) {
            case 'stripe':
                return new StripePaymentProvider();

            // 未來可以添加其他支付提供商
            // case 'paypal':
            //     return new PayPalPaymentProvider();
            // case 'alipay':
            //     return new AlipayPaymentProvider();

            default:
                throw new Error(`不支持的支付提供商: ${providerName}`);
        }
    }

    /**
     * 獲取所有支持的支付提供商名稱
     */
    static getSupportedProviders(): string[] {
        return ['stripe'];
        // 未來可以返回: ['stripe', 'paypal', 'alipay']
    }

    /**
     * 清除所有緩存的提供商實例
     */
    static clearCache(): void {
        this.providers.clear();
    }
}
