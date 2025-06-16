# 多支付平台架構重構方案（File Name: 20250616_MULTI_PROVIDER_ARCHITECTURE.md）

## 🔍 現狀分析

### ❌ 當前架構的限制

1. **緊密耦合 Stripe**
   - 服務層直接調用 Stripe API
   - 數據庫字段硬編碼 Stripe 特定字段
   - Webhook 處理只支持 Stripe 事件

2. **擴展性問題**
   - 添加新支付平台需要大量重構
   - 沒有統一的支付接口抽象
   - 業務邏輯與支付實現混合

## 🚀 重構方案

### 1. 創建支付提供商抽象層

```typescript
// src/payment/interfaces/PaymentProvider.interface.ts
export interface PaymentProvider {
    readonly name: string;
    initialize(config: PaymentProviderConfig): void;
    createProduct(data: ProductData): Promise<PaymentProduct>;
    createPrice(data: PriceData): Promise<PaymentPrice>;
    createCheckoutSession(data: CheckoutData): Promise<CheckoutSession>;
    verifyWebhookSignature(payload: Buffer, signature: string): WebhookEvent;
    parseWebhookEvent(event: WebhookEvent): ParsedEvent;
}
```

### 2. 數據庫架構調整

#### 當前結構
```prisma
model PricingPlan {
  stripeProductId  String?  // ❌ 只適用於 Stripe
  stripePriceId    String?  // ❌ 只適用於 Stripe
}
```

#### 建議的新結構
```prisma
model PricingPlan {
  // 移除 Stripe 特定字段
  // stripeProductId  String?
  // stripePriceId    String?
  
  // 添加通用字段
  paymentProvider     String  @default("stripe")  // 支付提供商名稱
  paymentProviderData Json?   // 存儲提供商特定數據
}

model PurchaseOrder {
  // 移除 Stripe 特定字段
  // stripeData Json?
  
  // 添加通用字段
  paymentProvider     String  @default("stripe")
  paymentProviderData Json?   // 存儲提供商特定數據
}
```

### 3. 支付提供商實現

#### Stripe 提供商
```typescript
// src/payment/providers/StripePaymentProvider.ts
export class StripePaymentProvider implements PaymentProvider {
    readonly name = 'stripe';
    
    async createProduct(data: ProductData): Promise<PaymentProduct> {
        const product = await this.stripe.products.create({
            name: data.name,
            description: data.description,
        });
        
        return {
            id: product.id,
            name: product.name,
            description: product.description,
        };
    }
    
    // ... 其他方法實現
}
```

#### 未來的 PayPal 提供商
```typescript
// src/payment/providers/PayPalPaymentProvider.ts
export class PayPalPaymentProvider implements PaymentProvider {
    readonly name = 'paypal';
    
    async createProduct(data: ProductData): Promise<PaymentProduct> {
        // PayPal API 調用
        const product = await this.paypal.catalog.products.create({
            name: data.name,
            description: data.description,
        });
        
        return {
            id: product.id,
            name: product.name,
            description: product.description,
        };
    }
    
    // ... 其他方法實現
}
```

### 4. 工廠模式

```typescript
// src/payment/factories/PaymentProviderFactory.ts
export class PaymentProviderFactory {
    static getProvider(providerName: string, config: PaymentProviderConfig): PaymentProvider {
        switch (providerName.toLowerCase()) {
            case 'stripe':
                return new StripePaymentProvider();
            case 'paypal':
                return new PayPalPaymentProvider();
            case 'alipay':
                return new AlipayPaymentProvider();
            default:
                throw new Error(`不支持的支付提供商: ${providerName}`);
        }
    }
}
```

### 5. 重構服務層

```typescript
// src/payment/services/PaymentService.ts
@Service()
export class PaymentService {
    private getPaymentProvider(providerName: string = 'stripe'): PaymentProvider {
        const config = this.getProviderConfig(providerName);
        return PaymentProviderFactory.getProvider(providerName, config);
    }
    
    async createPricingPlan(data: CreatePricingPlanDto, providerName: string = 'stripe') {
        const provider = this.getPaymentProvider(providerName);
        
        // 創建產品和價格
        const product = await provider.createProduct({...});
        const price = await provider.createPrice({...});
        
        // 保存到數據庫（通用格式）
        return await prisma.pricingPlan.create({
            data: {
                // ... 基本字段
                paymentProvider: providerName,
                paymentProviderData: {
                    productId: product.id,
                    priceId: price.id,
                    product,
                    price,
                },
            },
        });
    }
    
    async handleWebhookEvent(payload: Buffer, signature: string, providerName: string) {
        const provider = this.getPaymentProvider(providerName);
        
        // 驗證簽名
        const event = provider.verifyWebhookSignature(payload, signature);
        
        // 解析事件
        const parsedEvent = provider.parseWebhookEvent(event);
        
        // 統一處理邏輯
        switch (parsedEvent.type) {
            case 'payment_succeeded':
                await this.handlePaymentSuccess(parsedEvent);
                break;
            // ... 其他事件
        }
    }
}
```

## 📋 遷移步驟

### 階段 1：準備工作
1. ✅ 創建支付提供商接口
2. ✅ 實現 Stripe 提供商
3. ✅ 創建工廠類

### 階段 2：數據庫遷移
```sql
-- 添加新字段
ALTER TABLE pricing_plans 
ADD COLUMN payment_provider VARCHAR(50) DEFAULT 'stripe',
ADD COLUMN payment_provider_data JSONB;

-- 遷移現有數據
UPDATE pricing_plans 
SET payment_provider_data = jsonb_build_object(
    'productId', stripe_product_id,
    'priceId', stripe_price_id
)
WHERE stripe_product_id IS NOT NULL;

-- 類似地處理 purchase_orders 表
```

### 階段 3：代碼重構
1. 重構服務層使用新的抽象接口
2. 更新控制器以支持提供商選擇
3. 修改 Webhook 處理邏輯

### 階段 4：測試和部署
1. 確保現有 Stripe 功能正常
2. 添加新支付提供商
3. 逐步遷移用戶

## 🔧 配置管理

### 環境變量
```env
# 默認支付提供商
DEFAULT_PAYMENT_PROVIDER=stripe

# Stripe 配置
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal 配置（未來）
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# Alipay 配置（未來）
ALIPAY_APP_ID=...
ALIPAY_PRIVATE_KEY=...
```

### 動態配置
```typescript
// src/payment/config/providers.config.ts
export const PAYMENT_PROVIDERS = {
    stripe: {
        name: 'Stripe',
        enabled: true,
        config: {
            apiKey: process.env.STRIPE_SECRET_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        },
    },
    paypal: {
        name: 'PayPal',
        enabled: false, // 暫時禁用
        config: {
            clientId: process.env.PAYPAL_CLIENT_ID,
            clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        },
    },
};
```

## 🎯 優勢

### 1. 靈活性
- 輕鬆添加新的支付提供商
- 可以為不同協會配置不同的支付方式
- 支持 A/B 測試不同支付平台

### 2. 可維護性
- 統一的接口降低複雜性
- 業務邏輯與支付實現分離
- 更容易進行單元測試

### 3. 擴展性
- 支持多種支付方式並存
- 可以根據地區選擇最佳支付平台
- 為未來的功能擴展奠定基礎

## 📊 實施建議

### 短期（1-2 週）
1. 實現基本的抽象接口
2. 重構現有 Stripe 代碼使用新接口
3. 確保向後兼容

### 中期（1-2 個月）
1. 完成數據庫遷移
2. 添加第二個支付提供商（如 PayPal）
3. 實現動態提供商選擇

### 長期（3-6 個月）
1. 添加更多支付提供商
2. 實現智能路由（根據用戶地區自動選擇）
3. 添加支付分析和報表功能

## 🔄 向後兼容

重構過程中確保：
- 現有 API 端點繼續工作
- 現有數據不丟失
- 現有 Webhook 繼續處理
- 逐步遷移，不影響生產環境

這個架構設計讓你的支付系統具備了支持多種支付平台的能力，同時保持了代碼的清潔和可維護性。 