# NFC LinkCard Express - Payment API 完整參考文檔

## 📋 **重要提醒**
**基礎 URL**: `http://localhost:3020/api/payment`  
**認證方式**: Bearer Token (大部分端點需要)

## 🎯 **API 端點總覽**

### 📊 **定價方案管理 (Pricing Plans)**
| 方法 | 端點 | 描述 | 認證 |
|------|------|------|------|
| GET | `/pricing-plans/association/{associationId}` | 獲取協會的定價方案列表 | ✅ |
| GET | `/pricing-plans/{id}` | 獲取單個定價方案詳情 | ✅ |
| POST | `/pricing-plans/{associationId}` | 創建定價方案 (已棄用) | ✅ |
| PATCH | `/pricing-plans/{id}` | 更新定價方案 | ✅ |
| DELETE | `/pricing-plans/{id}` | 刪除定價方案 | ✅ |
| PATCH | `/pricing-plans/{id}/activate` | 啟用定價方案 | ✅ |
| PATCH | `/pricing-plans/{id}/deactivate` | 停用定價方案 | ✅ |

### 🛒 **購買訂單管理 (Purchase Orders)**
| 方法 | 端點 | 描述 | 認證 |
|------|------|------|------|
| POST | `/purchase-orders` | 創建購買訂單並獲取 Stripe Checkout URL | ✅ |
| GET | `/purchase-orders` | 獲取用戶的購買訂單列表 | ✅ |
| GET | `/purchase-orders/{id}` | 獲取單個購買訂單詳情 | ✅ |
| GET | `/purchase-orders/status/session/{sessionId}` | 通過 Session ID 查詢支付狀態 | ✅ |
| POST | `/purchase-orders/webhook` | Stripe Webhook 處理 | ❌ |

---

## 📝 **詳細 API 文檔**

## 1. 定價方案管理 API

### 1.1 獲取協會的定價方案列表
```http
GET /api/payment/pricing-plans/association/{associationId}
Authorization: Bearer {token}
```

**請求參數**:
- `associationId` (path, required): 協會 ID

**響應示例**:
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "plan-uuid",
        "name": "basic_plan",
        "displayName": "基礎會員",
        "description": "基礎會員權益包含...",
        "membershipTier": "BASIC",
        "price": "100.00",
        "currency": "HKD",
        "billingCycle": "YEARLY",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 1.2 獲取單個定價方案詳情
```http
GET /api/payment/pricing-plans/{id}
Authorization: Bearer {token}
```

### 1.3 創建定價方案 (已棄用)
```http
POST /api/payment/pricing-plans/{associationId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "premium_plan",
  "displayName": "高級會員",
  "description": "高級會員權益包含...",
  "membershipTier": "PREMIUM",
  "price": 300.00,
  "currency": "HKD",
  "billingCycle": "YEARLY"
}
```

**注意**: 此端點已棄用，請使用 `/api/association/associations/{id}/pricing-plans`

### 1.4 更新定價方案
```http
PATCH /api/payment/pricing-plans/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "displayName": "更新後的高級會員",
  "description": "更新後的描述",
  "price": 350.00
}
```

### 1.5 啟用/停用定價方案
```http
PATCH /api/payment/pricing-plans/{id}/activate
Authorization: Bearer {token}
```

```http
PATCH /api/payment/pricing-plans/{id}/deactivate
Authorization: Bearer {token}
```

---

## 2. 購買訂單管理 API

### 2.1 創建購買訂單 ⭐ **最重要的端點**
```http
POST /api/payment/purchase-orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "pricingPlanId": "plan-uuid",
  "successUrl": "https://yoursite.com/payment/success?session_id={CHECKOUT_SESSION_ID}",
  "cancelUrl": "https://yoursite.com/payment/cancel"
}
```

**響應示例**:
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order-uuid",
      "orderNumber": "ORDER-ABC123",
      "status": "PENDING",
      "amount": "300.00",
      "currency": "HKD",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "pricingPlan": {
        "id": "plan-uuid",
        "displayName": "高級會員",
        "membershipTier": "PREMIUM"
      },
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "username": "username"
      }
    },
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_..."
  }
}
```

**使用方法**:
```javascript
// 前端代碼
const response = await fetch('/api/payment/purchase-orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    pricingPlanId: 'your-plan-id',
    successUrl: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${window.location.origin}/payment/cancel`
  })
});

const { data } = await response.json();
// 重定向到 Stripe Checkout
window.location.href = data.checkoutUrl;
```

### 2.2 獲取用戶的購買訂單列表
```http
GET /api/payment/purchase-orders
Authorization: Bearer {token}
```

**響應示例**:
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order-uuid",
        "orderNumber": "ORDER-ABC123",
        "status": "PAID",
        "amount": "300.00",
        "currency": "HKD",
        "paidAt": "2024-01-01T10:00:00.000Z",
        "pricingPlan": {
          "displayName": "高級會員",
          "membershipTier": "PREMIUM"
        },
        "association": {
          "name": "科技協會",
          "slug": "tech-association"
        }
      }
    ]
  }
}
```

### 2.3 獲取單個購買訂單詳情
```http
GET /api/payment/purchase-orders/{id}
Authorization: Bearer {token}
```

### 2.4 通過 Session ID 查詢支付狀態 ⭐ **支付成功後使用**
```http
GET /api/payment/purchase-orders/status/session/{sessionId}
Authorization: Bearer {token}
```

**使用場景**: 用戶從 Stripe Checkout 返回後，通過 URL 中的 `session_id` 查詢支付結果

**響應示例**:
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order-uuid",
      "orderNumber": "ORDER-ABC123",
      "status": "PAID",
      "amount": "300.00",
      "currency": "HKD",
      "paidAt": "2024-01-01T10:00:00.000Z",
      "membershipStartDate": "2024-01-01T10:00:00.000Z",
      "membershipEndDate": "2025-01-01T10:00:00.000Z",
      "pricingPlan": {
        "displayName": "高級會員",
        "membershipTier": "PREMIUM"
      },
      "association": {
        "name": "科技協會",
        "slug": "tech-association"
      }
    },
    "membership": {
      "id": "member-uuid",
      "tier": "PREMIUM",
      "status": "ACTIVE",
      "renewalDate": "2025-01-01T10:00:00.000Z"
    },
    "paymentStatus": "PAID",
    "isProcessed": true
  }
}
```

**前端使用示例**:
```javascript
// 在支付成功頁面 (/payment/success)
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session_id');

if (sessionId) {
  const response = await fetch(`/api/payment/purchase-orders/status/session/${sessionId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { data } = await response.json();
  if (data.paymentStatus === 'PAID') {
    // 顯示支付成功信息
    console.log('支付成功！會員已激活');
  }
}
```

### 2.5 Stripe Webhook 處理
```http
POST /api/payment/purchase-orders/webhook
Content-Type: application/json
Stripe-Signature: {stripe_signature}

{
  // Stripe webhook payload
}
```

**注意**: 此端點僅供 Stripe 調用，不需要前端直接使用

---

## 🚀 **完整的前端購買流程示例**

### 步驟 1: 獲取定價方案
```javascript
async function loadPricingPlans(associationId) {
  const response = await fetch(`/api/payment/pricing-plans/association/${associationId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { data } = await response.json();
  return data.plans;
}
```

### 步驟 2: 創建訂單並跳轉支付
```javascript
async function purchaseMembership(pricingPlanId) {
  const response = await fetch('/api/payment/purchase-orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pricingPlanId,
      successUrl: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/payment/cancel`
    })
  });
  
  const { data } = await response.json();
  window.location.href = data.checkoutUrl;
}
```

### 步驟 3: 驗證支付結果
```javascript
async function verifyPayment() {
  const sessionId = new URLSearchParams(window.location.search).get('session_id');
  
  const response = await fetch(`/api/payment/purchase-orders/status/session/${sessionId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { data } = await response.json();
  return data;
}
```

---

## 🔧 **錯誤處理**

### 常見錯誤碼
| 狀態碼 | 錯誤碼 | 描述 |
|--------|--------|------|
| 400 | `VALIDATION_ERROR` | 請求參數驗證失敗 |
| 401 | `USER_NOT_AUTHENTICATED` | 用戶未認證 |
| 403 | `PERMISSION_DENIED` | 權限不足 |
| 404 | `PRICING_PLAN_NOT_FOUND` | 定價方案不存在 |
| 404 | `PURCHASE_ORDER_NOT_FOUND` | 購買訂單不存在 |
| 404 | `ORDER_NOT_FOUND` | 通過 Session ID 找不到訂單 |
| 400 | `ALREADY_ACTIVE_MEMBER` | 用戶已經是活躍會員 |

### 錯誤響應格式
```json
{
  "success": false,
  "error": {
    "message": "定價方案不存在或已停用",
    "code": "PRICING_PLAN_NOT_FOUND",
    "details": "詳細錯誤信息"
  }
}
```

---

## 🎯 **前端工程師必須知道的端點**

### ⭐ **核心端點 (必須使用)**
1. `GET /pricing-plans/association/{associationId}` - 獲取定價方案
2. `POST /purchase-orders` - 創建訂單並獲取支付 URL
3. `GET /purchase-orders/status/session/{sessionId}` - 驗證支付結果

### ✅ **輔助端點 (可選使用)**
1. `GET /purchase-orders` - 查看用戶的訂單歷史
2. `GET /purchase-orders/{id}` - 查看特定訂單詳情

### ❌ **不要使用的端點**
1. `POST /purchase-orders/webhook` - 僅供 Stripe 使用
2. `POST /pricing-plans/{associationId}` - 已棄用，請使用協會模塊的端點

---

## 🔍 **測試指南**

### 1. 測試創建訂單
```javascript
// 在瀏覽器控制台執行
fetch('/api/payment/purchase-orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    pricingPlanId: 'your-plan-id',
    successUrl: window.location.origin + '/success',
    cancelUrl: window.location.origin + '/cancel'
  })
}).then(res => res.json()).then(console.log);
```

### 2. 檢查數據庫
```sql
-- 檢查是否成功創建訂單
SELECT * FROM purchase_orders ORDER BY created_at DESC LIMIT 5;
```

### 3. 檢查服務器日誌
成功創建訂單時應該看到：
```
🔍 創建購買訂單請求: { userId: "...", body: {...} }
✅ 購買訂單創建成功: { orderId: "...", checkoutUrl: "..." }
```

---

## 📞 **技術支持**

如果遇到問題：
1. 檢查請求格式是否正確
2. 確認 Authorization token 是否有效
3. 查看瀏覽器 Network 面板的錯誤信息
4. 聯繫後端工程師進行聯合調試

## 🎉 **總結**

這個 Payment API 系統採用現代化的設計：
- ✅ 使用 Stripe Checkout 確保安全性
- ✅ 自動化的會員狀態管理
- ✅ 完整的訂單跟蹤
- ✅ 清晰的錯誤處理

只要按照文檔使用正確的端點，整個支付流程應該能順利運行！ 