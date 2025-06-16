# 支付模塊 API 文檔

## 📋 MVP 完成狀態

### ✅ 已完成功能
- [x] **定價方案管理 (CRUD)**
  - [x] 創建定價方案並自動創建 Stripe 產品/價格
  - [x] 獲取協會定價方案列表
  - [x] 獲取單個定價方案詳情
  - [x] 更新定價方案
  - [x] 啟用/停用定價方案
- [x] **購買訂單管理**
  - [x] 創建購買訂單並生成 Stripe Checkout 會話
  - [x] 獲取用戶購買訂單列表
  - [x] 獲取單個購買訂單詳情
- [x] **Stripe 集成**
  - [x] Stripe Checkout 會話生成
  - [x] Stripe Webhook 事件處理
  - [x] 自動產品/價格創建
- [x] **會員權益管理**
  - [x] 支付成功後自動創建/更新會員記錄
  - [x] 會員狀態和期限管理
- [x] **多支付平台架構預留**
  - [x] PaymentProvider 接口定義
  - [x] StripePaymentProvider 實現
  - [x] PaymentProviderFactory 工廠模式

### 🔄 進行中功能
- [ ] 數據庫遷移到通用支付字段
- [ ] 添加其他支付提供商（PayPal、Alipay）
- [ ] 退款功能
- [ ] 訂閱管理功能

### 📊 MVP 完成度：**90%**

---

## 🚀 API 端點總覽

### 基礎 URL
```
http://localhost:3020/api/payment
```

### 認證
大部分端點需要 Bearer Token 認證：
```
Authorization: Bearer <your_jwt_token>
```

---

## 📝 定價方案管理 API

### 1. 獲取協會定價方案列表

**GET** `/pricing-plans/association/{associationId}`

#### 請求參數
| 參數 | 類型 | 必需 | 描述 |
|------|------|------|------|
| associationId | string | ✅ | 協會 ID |

#### 響應示例
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "uuid",
        "associationId": "uuid",
        "name": "basic_plan",
        "displayName": "基礎會員",
        "description": "基礎會員權益包含...",
        "membershipTier": "BASIC",
        "price": "100.00",
        "currency": "HKD",
        "billingCycle": "YEARLY",
        "stripeProductId": "prod_xxx",
        "stripePriceId": "price_xxx",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 2. 獲取單個定價方案

**GET** `/pricing-plans/{id}`

#### 請求參數
| 參數 | 類型 | 必需 | 描述 |
|------|------|------|------|
| id | string | ✅ | 定價方案 ID |

#### 響應示例
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "uuid",
      "associationId": "uuid",
      "name": "premium_plan",
      "displayName": "高級會員",
      "description": "高級會員權益包含...",
      "membershipTier": "PREMIUM",
      "price": "200.00",
      "currency": "HKD",
      "billingCycle": "YEARLY",
      "stripeProductId": "prod_xxx",
      "stripePriceId": "price_xxx",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 3. 創建定價方案

**POST** `/pricing-plans`

#### 認證
需要 Bearer Token

#### 請求體
```json
{
  "associationId": "uuid",
  "name": "executive_plan",
  "displayName": "執行會員",
  "description": "執行會員權益包含...",
  "membershipTier": "EXECUTIVE",
  "price": 500.00,
  "currency": "HKD",
  "billingCycle": "YEARLY"
}
```

#### 請求體參數
| 參數 | 類型 | 必需 | 描述 |
|------|------|------|------|
| associationId | string | ✅ | 協會 ID |
| name | string | ✅ | 方案內部名稱 |
| displayName | string | ✅ | 方案顯示名稱 |
| description | string | ❌ | 方案描述 |
| membershipTier | enum | ✅ | 會員等級：BASIC, PREMIUM, EXECUTIVE |
| price | number | ✅ | 價格（最多 2 位小數） |
| currency | string | ❌ | 貨幣代碼（默認：HKD） |
| billingCycle | string | ❌ | 計費週期（默認：YEARLY） |

#### 響應示例
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "uuid",
      "associationId": "uuid",
      "name": "executive_plan",
      "displayName": "執行會員",
      "description": "執行會員權益包含...",
      "membershipTier": "EXECUTIVE",
      "price": "500.00",
      "currency": "HKD",
      "billingCycle": "YEARLY",
      "stripeProductId": "prod_xxx",
      "stripePriceId": "price_xxx",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 4. 更新定價方案

**PATCH** `/pricing-plans/{id}`

#### 認證
需要 Bearer Token

#### 請求參數
| 參數 | 類型 | 必需 | 描述 |
|------|------|------|------|
| id | string | ✅ | 定價方案 ID |

#### 請求體
```json
{
  "displayName": "更新後的執行會員",
  "description": "更新後的執行會員權益...",
  "price": 600.00
}
```

#### 請求體參數（所有參數都是可選的）
| 參數 | 類型 | 必需 | 描述 |
|------|------|------|------|
| name | string | ❌ | 方案內部名稱 |
| displayName | string | ❌ | 方案顯示名稱 |
| description | string | ❌ | 方案描述 |
| price | number | ❌ | 價格 |
| currency | string | ❌ | 貨幣代碼 |
| billingCycle | string | ❌ | 計費週期 |
| isActive | boolean | ❌ | 是否啟用 |

### 5. 啟用定價方案

**PATCH** `/pricing-plans/{id}/activate`

#### 認證
需要 Bearer Token

#### 請求參數
| 參數 | 類型 | 必需 | 描述 |
|------|------|------|------|
| id | string | ✅ | 定價方案 ID |

#### 響應示例
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "uuid",
      "isActive": true,
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 6. 停用定價方案

**PATCH** `/pricing-plans/{id}/deactivate`

#### 認證
需要 Bearer Token

#### 請求參數
| 參數 | 類型 | 必需 | 描述 |
|------|------|------|------|
| id | string | ✅ | 定價方案 ID |

---

## 💳 購買訂單管理 API

### 1. 創建購買訂單（生成支付鏈接）

**POST** `/purchase-orders`

#### 認證
需要 Bearer Token

#### 請求體
```json
{
  "pricingPlanId": "uuid",
  "currency": "HKD",
  "successUrl": "https://yoursite.com/payment/success",
  "cancelUrl": "https://yoursite.com/payment/cancel"
}
```

#### 請求體參數
| 參數 | 類型 | 必需 | 描述 |
|------|------|------|------|
| pricingPlanId | string | ✅ | 定價方案 ID |
| currency | string | ❌ | 貨幣代碼（默認使用方案設定） |
| successUrl | string | ❌ | 支付成功後跳轉 URL |
| cancelUrl | string | ❌ | 支付取消後跳轉 URL |

#### 響應示例
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "associationId": "uuid",
      "userId": "uuid",
      "pricingPlanId": "uuid",
      "orderNumber": "ORDER-1234567890",
      "amount": "500.00",
      "currency": "HKD",
      "status": "PENDING",
      "stripeData": {
        "sessionId": "cs_xxx",
        "sessionUrl": "https://checkout.stripe.com/pay/cs_xxx",
        "paymentIntentId": "pi_xxx"
      },
      "membershipStartDate": null,
      "membershipEndDate": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "paidAt": null,
      "pricingPlan": {
        "id": "uuid",
        "name": "executive_plan",
        "displayName": "執行會員",
        "membershipTier": "EXECUTIVE"
      },
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "username": "username",
        "display_name": "User Name"
      }
    },
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_xxx"
  }
}
```

### 2. 獲取用戶購買訂單列表

**GET** `/purchase-orders`

#### 認證
需要 Bearer Token

#### 響應示例
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "associationId": "uuid",
        "userId": "uuid",
        "pricingPlanId": "uuid",
        "orderNumber": "ORDER-1234567890",
        "amount": "500.00",
        "currency": "HKD",
        "status": "PAID",
        "stripeData": {
          "sessionId": "cs_xxx",
          "sessionUrl": "https://checkout.stripe.com/pay/cs_xxx",
          "paymentIntentId": "pi_xxx"
        },
        "membershipStartDate": "2024-01-01T00:00:00.000Z",
        "membershipEndDate": "2024-12-31T23:59:59.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "paidAt": "2024-01-01T00:05:00.000Z",
        "pricingPlan": {
          "id": "uuid",
          "name": "executive_plan",
          "displayName": "執行會員",
          "membershipTier": "EXECUTIVE"
        },
        "association": {
          "id": "uuid",
          "name": "示例協會",
          "slug": "example-association"
        }
      }
    ]
  }
}
```

### 3. 獲取單個購買訂單

**GET** `/purchase-orders/{id}`

#### 認證
需要 Bearer Token

#### 請求參數
| 參數 | 類型 | 必需 | 描述 |
|------|------|------|------|
| id | string | ✅ | 購買訂單 ID |

#### 響應示例
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "associationId": "uuid",
      "userId": "uuid",
      "pricingPlanId": "uuid",
      "orderNumber": "ORDER-1234567890",
      "amount": "500.00",
      "currency": "HKD",
      "status": "PAID",
      "stripeData": {
        "sessionId": "cs_xxx",
        "sessionUrl": "https://checkout.stripe.com/pay/cs_xxx",
        "paymentIntentId": "pi_xxx",
        "customerId": "cus_xxx",
        "subscriptionId": "sub_xxx"
      },
      "membershipStartDate": "2024-01-01T00:00:00.000Z",
      "membershipEndDate": "2024-12-31T23:59:59.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "paidAt": "2024-01-01T00:05:00.000Z"
    }
  }
}
```

---

## 🔗 Webhook 處理

### Stripe Webhook

**POST** `/purchase-orders/webhook`

#### 請求頭
| 頭部 | 類型 | 必需 | 描述 |
|------|------|------|------|
| Stripe-Signature | string | ✅ | Stripe 簽名 |

#### 支持的事件類型
- `checkout.session.completed` - 結帳會話完成
- `invoice.payment_succeeded` - 發票支付成功
- `invoice.payment_failed` - 發票支付失敗
- `customer.subscription.created` - 訂閱創建
- `customer.subscription.updated` - 訂閱更新
- `customer.subscription.deleted` - 訂閱刪除

#### 響應
```
200 OK
```

---

## 📊 數據模型

### PricingPlan（定價方案）
```typescript
interface PricingPlan {
  id: string;
  associationId: string;
  name: string;                    // 內部名稱，如 "basic_plan"
  displayName: string;             // 顯示名稱，如 "基礎會員"
  description?: string;            // 方案描述
  membershipTier: MembershipTier;  // BASIC | PREMIUM | EXECUTIVE
  price: string;                   // Decimal 作為字符串
  currency: string;                // 貨幣代碼，默認 "HKD"
  billingCycle: string;            // 計費週期，默認 "YEARLY"
  stripeProductId?: string;        // Stripe 產品 ID
  stripePriceId?: string;          // Stripe 價格 ID
  isActive: boolean;               // 是否啟用
  createdAt: Date;
  updatedAt: Date;
}
```

### PurchaseOrder（購買訂單）
```typescript
interface PurchaseOrder {
  id: string;
  associationId: string;
  userId: string;
  pricingPlanId: string;
  orderNumber: string;             // 訂單號
  amount: string;                  // Decimal 作為字符串
  currency: string;                // 貨幣代碼
  status: string;                  // PENDING | PAID | FAILED | REFUNDED
  stripeData?: Record<string, any>; // Stripe 相關數據
  membershipStartDate?: Date;      // 會員開始日期
  membershipEndDate?: Date;        // 會員結束日期
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;                   // 支付完成時間
}
```

### MembershipTier（會員等級）
```typescript
enum MembershipTier {
  BASIC = "BASIC",
  PREMIUM = "PREMIUM", 
  EXECUTIVE = "EXECUTIVE"
}
```

---

## 🔧 環境配置

在 `.env` 文件中添加以下配置：

```env
# Stripe 配置
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_SUCCESS_URL=http://localhost:3000/payment/success
STRIPE_CANCEL_URL=http://localhost:3000/payment/cancel
```

---

## 📝 使用流程示例

### 1. 創建定價方案
```bash
curl -X POST http://localhost:3020/api/payment/pricing-plans \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "associationId": "uuid",
    "name": "basic_plan",
    "displayName": "基礎會員",
    "description": "基礎會員權益",
    "membershipTier": "BASIC",
    "price": 100.00,
    "currency": "HKD",
    "billingCycle": "YEARLY"
  }'
```

### 2. 獲取協會定價方案
```bash
curl -X GET http://localhost:3020/api/payment/pricing-plans/association/uuid
```

### 3. 創建購買訂單
```bash
curl -X POST http://localhost:3020/api/payment/purchase-orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pricingPlanId": "uuid",
    "successUrl": "https://yoursite.com/success",
    "cancelUrl": "https://yoursite.com/cancel"
  }'
```

### 4. 用戶完成支付
用戶會被重定向到 Stripe Checkout 頁面完成支付。

### 5. Webhook 處理
支付完成後，Stripe 會發送 webhook 事件到我們的系統，自動：
- 更新訂單狀態為 "PAID"
- 創建或更新協會會員記錄
- 設置會員權益期限

---

## ⚠️ 錯誤處理

### 常見錯誤代碼

| 錯誤代碼 | HTTP 狀態 | 描述 |
|----------|-----------|------|
| VALIDATION_ERROR | 400 | 請求數據驗證失敗 |
| PRICING_PLAN_NOT_FOUND | 404 | 定價方案不存在 |
| ALREADY_ACTIVE_MEMBER | 400 | 用戶已經是活躍會員 |
| INSUFFICIENT_PERMISSIONS | 403 | 權限不足 |
| STRIPE_ERROR | 400/500 | Stripe API 錯誤 |
| WEBHOOK_PROCESSING_ERROR | 400 | Webhook 處理失敗 |

### 錯誤響應格式
```json
{
  "success": false,
  "error": {
    "message": "錯誤描述",
    "code": "ERROR_CODE",
    "details": "詳細錯誤信息"
  }
}
```

---

## 🚀 未來規劃

### Phase 2: 多支付平台支持
- [ ] PayPal 集成
- [ ] Alipay 集成
- [ ] WeChat Pay 集成
- [ ] 數據庫遷移到通用支付字段

### Phase 3: 高級功能
- [ ] 退款管理
- [ ] 訂閱管理（暫停、恢復、取消）
- [ ] 優惠券系統
- [ ] 分期付款
- [ ] 發票生成

### Phase 4: 分析和報告
- [ ] 支付分析儀表板
- [ ] 收入報告
- [ ] 會員增長分析
- [ ] 支付失敗分析

---

## 📞 技術支持

如有任何問題或需要技術支持，請聯繫開發團隊或查看相關文檔：
- [多支付平台架構文檔](./MULTI_PROVIDER_ARCHITECTURE.md)
- [Stripe 配置文檔](./config/stripe.config.ts)
- [支付服務文檔](./services/README.md) 