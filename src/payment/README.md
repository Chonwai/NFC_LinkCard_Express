# 支付模塊 MVP

這是一個基於 Stripe 的協會會員支付系統，支持訂閱制會員費收取。

## 功能特性

### 核心功能
- ✅ 定價方案管理（創建、更新、啟用/停用）
- ✅ Stripe 產品和價格自動創建
- ✅ 購買訂單管理
- ✅ Stripe Checkout 會話生成
- ✅ Webhook 事件處理
- ✅ 自動會員權益管理
- ✅ 支付成功後自動創建/更新會員記錄

### 支持的會員等級
- `BASIC` - 基礎會員
- `PREMIUM` - 高級會員  
- `EXECUTIVE` - 執行會員

### 支持的計費週期
- `MONTHLY` - 月付
- `YEARLY` - 年付

## 環境配置

在 `.env` 文件中添加以下配置：

```env
# Stripe 配置
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_SUCCESS_URL=http://localhost:3000/payment/success
STRIPE_CANCEL_URL=http://localhost:3000/payment/cancel
```

## API 端點

### 定價方案管理

#### 獲取協會定價方案
```http
GET /api/payment/pricing-plans/association/{associationId}
```

#### 創建定價方案
```http
POST /api/payment/pricing-plans
Authorization: Bearer {token}

{
  "associationId": "uuid",
  "name": "basic_plan",
  "displayName": "基礎會員",
  "description": "基礎會員權益",
  "membershipTier": "BASIC",
  "price": 100.00,
  "currency": "HKD",
  "billingCycle": "YEARLY"
}
```

#### 更新定價方案
```http
PATCH /api/payment/pricing-plans/{id}
Authorization: Bearer {token}

{
  "displayName": "更新後的基礎會員",
  "price": 120.00
}
```

#### 啟用/停用定價方案
```http
PATCH /api/payment/pricing-plans/{id}/activate
PATCH /api/payment/pricing-plans/{id}/deactivate
Authorization: Bearer {token}
```

### 購買訂單管理

#### 創建購買訂單（生成支付鏈接）
```http
POST /api/payment/purchase-orders
Authorization: Bearer {token}

{
  "pricingPlanId": "uuid",
  "currency": "HKD",
  "successUrl": "https://yoursite.com/success",
  "cancelUrl": "https://yoursite.com/cancel"
}
```

#### 獲取用戶購買訂單
```http
GET /api/payment/purchase-orders
Authorization: Bearer {token}
```

#### 獲取特定購買訂單
```http
GET /api/payment/purchase-orders/{id}
Authorization: Bearer {token}
```

### Webhook 處理
```http
POST /api/payment/purchase-orders/webhook
Stripe-Signature: {signature}
```

## 數據庫模型

### PricingPlan（定價方案）
```prisma
model PricingPlan {
  id               String          @id @default(uuid())
  associationId    String          @map("association_id")
  name             String          // 內部名稱
  displayName      String          @map("display_name") // 顯示名稱
  description      String?
  membershipTier   MembershipTier  @map("membership_tier")
  price            Decimal         @db.Decimal(10, 2)
  currency         String          @default("HKD")
  billingCycle     BillingCycle    @default(YEARLY) @map("billing_cycle")
  stripeProductId  String?         @map("stripe_product_id")
  stripePriceId    String?         @map("stripe_price_id")
  isActive         Boolean         @default(true) @map("is_active")
  createdAt        DateTime        @default(now()) @map("created_at")
  updatedAt        DateTime        @updatedAt @map("updated_at")
}
```

### PurchaseOrder（購買訂單）
```prisma
model PurchaseOrder {
  id                    String              @id @default(uuid())
  associationId         String              @map("association_id")
  userId                String              @map("user_id")
  pricingPlanId         String              @map("pricing_plan_id")
  orderNumber           String              @unique @map("order_number")
  amount                Decimal             @db.Decimal(10, 2)
  currency              String              @default("HKD")
  status                PurchaseOrderStatus @default(PENDING)
  stripeData            Json?               @map("stripe_data")
  paidAt                DateTime?           @map("paid_at")
  membershipStartDate   DateTime?           @map("membership_start_date")
  membershipEndDate     DateTime?           @map("membership_end_date")
  createdAt             DateTime            @default(now()) @map("created_at")
  updatedAt             DateTime            @updatedAt @map("updated_at")
}
```

## 業務流程

### 1. 設置定價方案
1. 協會管理員創建定價方案
2. 系統自動在 Stripe 創建對應的產品和價格
3. 定價方案可以啟用/停用

### 2. 用戶購買會員
1. 用戶選擇定價方案
2. 系統創建購買訂單
3. 生成 Stripe Checkout 會話
4. 用戶完成支付

### 3. 支付處理
1. Stripe 發送 Webhook 事件
2. 系統驗證 Webhook 簽名
3. 更新訂單狀態
4. 自動創建/更新會員記錄
5. 設置會員權益期限

### 4. 會員管理
- 支付成功後自動激活會員身份
- 設置會員等級和權益期限
- 支持會員續費和升級

## 安全考慮

1. **Webhook 驗證**：所有 Stripe Webhook 都經過簽名驗證
2. **權限控制**：只有協會管理員可以管理定價方案
3. **數據加密**：敏感的 Stripe 數據存儲在 JSON 字段中
4. **事務處理**：支付成功處理使用數據庫事務確保一致性

## 錯誤處理

系統包含完整的錯誤處理機制：
- API 錯誤統一格式化
- Webhook 處理失敗記錄
- 支付失敗自動處理
- 詳細的錯誤日誌

## 測試

### 測試用 Stripe 卡號
```
成功支付: 4242424242424242
需要驗證: 4000002500003155
被拒絕: 4000000000000002
```

### Webhook 測試
使用 Stripe CLI 進行本地測試：
```bash
stripe listen --forward-to localhost:3020/api/payment/purchase-orders/webhook
```

## 部署注意事項

1. 確保設置正確的 Stripe 密鑰（生產環境使用 `sk_live_`）
2. 配置正確的 Webhook 端點
3. 設置適當的成功/取消頁面 URL
4. 確保數據庫遷移已執行

## 後續擴展

這個 MVP 為後續功能擴展奠定了基礎：
- 多種支付方式支持
- 優惠券和折扣
- 發票生成
- 退款處理
- 分析報表
- 會員等級自動升級/降級 