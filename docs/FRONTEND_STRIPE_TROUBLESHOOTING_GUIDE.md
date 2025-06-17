# 🚨 前端 Stripe 集成問題解決指南

## 📋 問題診斷

根據你哋提供嘅錯誤信息，主要有以下問題：

### ❌ 問題 1：API 端點錯誤
- **錯誤使用**：`POST /api/stripe/create-checkout-session`
- **正確端點**：`POST /api/payment/purchase-orders`

### ❌ 問題 2：認證失敗 (401 錯誤)
- **錯誤原因**：Token 格式不正確或 JWT_SECRET 配置問題
- **錯誤信息**：`{"success":false,"error":{"message":"無效的 token","code":"INVALID_TOKEN"}}`

### ❌ 問題 3：請求格式不匹配
- **前端發送**：
  ```json
  {
    "associationId": "...",
    "pricingPlanId": "...",
    "successUrl": "...",
    "cancelUrl": "...",
    "metadata": {...}
  }
  ```
- **後端期望**：
  ```json
  {
    "pricingPlanId": "...",
    "successUrl": "...",
    "cancelUrl": "..."
  }
  ```

### ❌ 問題 4：網絡配置混亂
- 混用 `localhost:4000` 和 `127.0.0.1:3020`

---

## ✅ 正確的解決方案

### 1. 更新 API 端點

將你嘅前端代碼中嘅端點改為：
```typescript
// ❌ 錯誤
const response = await fetch('/api/stripe/create-checkout-session', ...)

// ✅ 正確
const response = await fetch('/api/payment/purchase-orders', ...)
```

### 2. 修正認證 Token 格式

確保 Token 格式正確：
```typescript
// ✅ 正確的認證格式
const response = await fetch('/api/payment/purchase-orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,  // 確保有 "Bearer " 前綴
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestData)
});
```

### 3. 修正請求體格式

```typescript
// ❌ 錯誤的請求格式
const requestData = {
  associationId: "...",
  pricingPlanId: "...",
  successUrl: "...",
  cancelUrl: "...",
  metadata: {...}
};

// ✅ 正確的請求格式
const requestData = {
  pricingPlanId: "93271f48-755c-4a01-aa60-8e9302b453dc",
  successUrl: `${window.location.origin}/success`,
  cancelUrl: `${window.location.origin}/cancel`
};
```

---

## 🔧 完整工作代碼示例

### 前端實現 (Next.js API Route)

```typescript
// app/api/stripe/create-checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { pricingPlanId, successUrl, cancelUrl } = await request.json();
    
    // 從 cookie 或 session 獲取認證 token
    const token = request.cookies.get('authToken')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: '用戶未認證' }, 
        { status: 401 }
      );
    }

    // ✅ 正確的 API 調用
    const response = await fetch(`${process.env.BACKEND_URL}/api/payment/purchase-orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pricingPlanId,
        successUrl: successUrl || `${process.env.FRONTEND_URL}/success`,
        cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/cancel`
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('後端錯誤:', errorData);
      return NextResponse.json(
        { error: errorData.error || '創建支付會話失敗' },
        { status: response.status }
      );
    }

    const { data } = await response.json();
    
    return NextResponse.json({
      success: true,
      checkoutUrl: data.checkoutUrl,
      orderId: data.order.id
    });

  } catch (error) {
    console.error('Stripe Checkout 創建失敗:', error);
    return NextResponse.json(
      { error: '服務器內部錯誤' },
      { status: 500 }
    );
  }
}
```

### 前端組件實現

```typescript
// components/PaymentButton.tsx
'use client';

import { useState } from 'react';

interface PaymentButtonProps {
  pricingPlanId: string;
  planName: string;
  amount: number;
}

export default function PaymentButton({ pricingPlanId, planName, amount }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // ✅ 調用你的前端 API Route
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pricingPlanId,
          successUrl: `${window.location.origin}/payment/success?plan=${planName}`,
          cancelUrl: `${window.location.origin}/payment/cancel`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '創建支付會話失敗');
      }

      const { checkoutUrl, orderId } = await response.json();
      
      // 保存訂單 ID 到本地存儲，用於後續查詢
      localStorage.setItem('currentOrderId', orderId);
      
      // 重定向到 Stripe Checkout
      window.location.href = checkoutUrl;

    } catch (error) {
      console.error('支付流程錯誤:', error);
      setError(error instanceof Error ? error.message : '支付失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '正在處理...' : `支付 $${amount} - ${planName}`}
      </button>
    </div>
  );
}
```

### 成功頁面實現

```typescript
// app/payment/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const [orderStatus, setOrderStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    const checkOrderStatus = async () => {
      const orderId = localStorage.getItem('currentOrderId');
      
      if (!orderId) {
        setOrderStatus('error');
        return;
      }

      try {
        const token = getCookie('authToken'); // 實現你的 token 獲取邏輯
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/purchase-orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const { data } = await response.json();
          setOrderData(data.order);
          setOrderStatus(data.order.status === 'PAID' ? 'success' : 'error');
        } else {
          setOrderStatus('error');
        }
      } catch (error) {
        console.error('查詢訂單狀態失敗:', error);
        setOrderStatus('error');
      }
    };

    checkOrderStatus();
  }, []);

  if (orderStatus === 'loading') {
    return <div>正在確認支付狀態...</div>;
  }

  if (orderStatus === 'error') {
    return <div>支付驗證失敗，請聯繫客服</div>;
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
      <h1 className="text-2xl font-bold text-green-800 mb-4">支付成功！</h1>
      <p className="text-green-700 mb-4">
        歡迎加入 {orderData?.association?.name}！
      </p>
      <div className="space-y-2 text-sm text-green-600">
        <p>訂單號：{orderData?.orderNumber}</p>
        <p>會員等級：{orderData?.pricingPlan?.displayName}</p>
        <p>生效日期：{new Date(orderData?.membershipStartDate).toLocaleDateString()}</p>
        <p>到期日期：{new Date(orderData?.membershipEndDate).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

function getCookie(name: string): string | undefined {
  // 實現你的 cookie 獲取邏輯
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')[1];
}
```

---

## 🔍 故障排除步驟

### 步驟 1：檢查環境變數

確保以下環境變數正確設置：

```env
# .env.local (前端)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3020
BACKEND_URL=http://localhost:3020
FRONTEND_URL=http://localhost:3000

# .env (後端)
JWT_SECRET=your-secret-key-here
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 步驟 2：驗證認證 Token

在瀏覽器開發者工具中檢查：
1. Token 是否存在
2. Token 格式是否正確 (Bearer xxxxx)
3. Token 是否已過期

```typescript
// 調試用：檢查 token
const token = getCookie('authToken');
console.log('Token:', token);

// 解碼 JWT (不要在生產環境中這樣做)
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token payload:', payload);
  console.log('Token expires:', new Date(payload.exp * 1000));
}
```

### 步驟 3：測試 API 連接

```typescript
// 測試後端連接
const testConnection = async () => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/health`);
    console.log('後端連接狀態:', response.status);
  } catch (error) {
    console.error('後端連接失敗:', error);
  }
};
```

### 步驟 4：檢查 CORS 設置

確保後端 CORS 配置包含你的前端域名：

```typescript
// 後端 CORS 配置應該包括
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:4000'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 🧪 測試方法

### 1. 使用 Postman/curl 測試後端

```bash
# 測試認證
curl -X POST http://localhost:3020/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 測試創建購買訂單
curl -X POST http://localhost:3020/api/payment/purchase-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "pricingPlanId": "93271f48-755c-4a01-aa60-8e9302b453dc",
    "successUrl": "http://localhost:3000/success",
    "cancelUrl": "http://localhost:3000/cancel"
  }'
```

### 2. 前端調試代碼

```typescript
// 添加詳細日誌
const createCheckoutSession = async (pricingPlanId: string) => {
  console.log('開始創建 Checkout Session...');
  console.log('Pricing Plan ID:', pricingPlanId);
  
  const token = getCookie('authToken');
  console.log('Token exists:', !!token);
  
  try {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pricingPlanId })
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('API 錯誤:', errorData);
      throw new Error(errorData.error);
    }
    
    const data = await response.json();
    console.log('成功響應:', data);
    
    return data;
  } catch (error) {
    console.error('請求失敗:', error);
    throw error;
  }
};
```

---

## ⚡ 快速修復清單

1. **更新 API 端點**：`/api/stripe/create-checkout-session` → `/api/payment/purchase-orders`
2. **修正請求格式**：只發送 `{ pricingPlanId, successUrl, cancelUrl }`
3. **檢查 Token 格式**：確保是 `Bearer ${token}`
4. **統一網絡配置**：使用一致的 host:port
5. **設置環境變數**：配置正確的 BACKEND_URL 和 JWT_SECRET
6. **測試認證**：先確保登入 API 能正常工作

---

## 📞 如果還有問題

如果按照以上步驟還是有問題，請提供：

1. **完整的錯誤堆棧**
2. **網絡請求詳情** (在瀏覽器開發者工具中的 Network 標籤)
3. **環境變數配置** (去掉敏感信息)
4. **後端日誌輸出**

我們可以進一步協助解決！🚀 