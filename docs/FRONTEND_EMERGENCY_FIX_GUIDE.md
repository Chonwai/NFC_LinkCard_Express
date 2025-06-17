# 🚨 前端緊急修復指南

## 📋 **當前問題總結**

**錯誤：**
```
404 - Cannot POST /api/payments/webhook/checkout-completed
500 - /api/stripe/manual-sync
```

**根本原因：** 前端使用了錯誤的 API 端點和流程

## ⚡ **立即修復方案**

### **第1步：修正 API 端點**

❌ **錯誤的端點：**
```typescript
// 不要這樣做
POST /api/payments/webhook/checkout-completed
POST /api/stripe/manual-sync
```

✅ **正確的端點：**
```typescript
// 查詢支付狀態
GET /api/payment/status/session/{sessionId}

// 查詢特定訂單
GET /api/payment/purchase-orders/{orderId}
```

### **第2步：修正支付確認流程**

❌ **錯誤的做法（手動觸發 webhook）：**
```typescript
// 不要這樣做 - 安全風險！
const response = await fetch('/api/payments/webhook/checkout-completed', {
  method: 'POST',
  body: JSON.stringify({ sessionId })
});
```

✅ **正確的做法（查詢狀態）：**
```typescript
// 從 Stripe 重定向 URL 獲取 session_id
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session_id');

// 查詢支付狀態
const response = await fetch(`/api/payment/status/session/${sessionId}`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();

if (result.success) {
  const { order, membership, isProcessed } = result.data;
  
  if (isProcessed) {
    // 支付成功，顯示成功頁面
    showSuccessPage(order, membership);
  } else {
    // 還在處理中，啟動輪詢
    pollPaymentStatus(sessionId);
  }
}
```

### **第3步：實現輪詢機制**

```typescript
async function pollPaymentStatus(sessionId: string) {
  const maxAttempts = 30; // 最多檢查30次（1分鐘）
  const pollInterval = 2000; // 每2秒檢查一次
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`/api/payment/status/session/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success && result.data.isProcessed) {
        // 處理完成
        showSuccessPage(result.data.order, result.data.membership);
        return;
      }
      
      // 還沒處理完，等待下次檢查
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
      
    } catch (error) {
      console.error(`輪詢失敗 (第${attempt}次):`, error);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
  }
  
  // 超時處理
  showTimeoutError();
}
```

## 🔧 **完整的支付確認頁面示例**

```typescript
// success.tsx 或 success.js
import React, { useEffect, useState } from 'react';

interface PaymentResult {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    amount: number;
    currency: string;
    paidAt: string;
    pricingPlan: {
      displayName: string;
      membershipTier: string;
    };
    association: {
      name: string;
    };
  };
  membership?: {
    tier: string;
    status: string;
    renewalDate: string;
  };
  isProcessed: boolean;
}

const PaymentSuccessPage: React.FC = () => {
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handlePaymentConfirmation = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');

      if (!sessionId) {
        setError('缺少支付會話 ID');
        setLoading(false);
        return;
      }

      try {
        await checkPaymentStatus(sessionId);
      } catch (err) {
        setError('支付確認失敗');
        setLoading(false);
      }
    };

    handlePaymentConfirmation();
  }, []);

  const checkPaymentStatus = async (sessionId: string) => {
    const response = await fetch(`/api/payment/status/session/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    const apiResult = await response.json();

    if (!apiResult.success) {
      throw new Error(apiResult.error?.message || '查詢失敗');
    }

    if (apiResult.data.isProcessed) {
      setResult(apiResult.data);
      setLoading(false);
    } else {
      // 啟動輪詢
      await pollForCompletion(sessionId);
    }
  };

  const pollForCompletion = async (sessionId: string) => {
    const maxAttempts = 30;
    
    for (let i = 1; i <= maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const response = await fetch(`/api/payment/status/session/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        const apiResult = await response.json();

        if (apiResult.success && apiResult.data.isProcessed) {
          setResult(apiResult.data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error(`輪詢失敗 (第${i}次):`, err);
      }
    }

    setError('支付確認超時，請聯繫客服');
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="payment-loading">
        <h2>🔄 正在確認您的支付...</h2>
        <p>請稍候，我們正在處理您的會員激活。</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-error">
        <h2>❌ 支付確認失敗</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>重試</button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="payment-success">
        <h2>🎉 支付成功！</h2>
        <div className="order-details">
          <h3>訂單詳情</h3>
          <p><strong>訂單號：</strong>{result.order.orderNumber}</p>
          <p><strong>金額：</strong>{result.order.currency} {result.order.amount}</p>
          <p><strong>協會：</strong>{result.order.association.name}</p>
          <p><strong>會員等級：</strong>{result.order.pricingPlan.membershipTier}</p>
        </div>
        
        {result.membership && (
          <div className="membership-details">
            <h3>🏆 會員權益已激活</h3>
            <p><strong>會員等級：</strong>{result.membership.tier}</p>
            <p><strong>有效期至：</strong>{new Date(result.membership.renewalDate).toLocaleDateString()}</p>
          </div>
        )}
        
        <button onClick={() => window.location.href = '/dashboard'}>
          前往會員中心
        </button>
      </div>
    );
  }

  return null;
};

export default PaymentSuccessPage;
```

## 🚀 **測試步驟**

### 1. **測試查詢 API**
```bash
# 使用測試的 session_id
curl -X GET "http://localhost:4000/api/payment/status/session/cs_test_a1Nf1jSwVJaIZXXH8U9lolT1j7QXgNQ3V2gU2R2yO4nKX1PqNzOORuRNKQ" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. **預期響應**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order-uuid",
      "orderNumber": "ORDER-1234567890",
      "status": "PAID",
      "amount": 500,
      "currency": "HKD",
      "paidAt": "2024-01-01T12:00:00Z",
      "membershipStartDate": "2024-01-01T12:00:00Z",
      "membershipEndDate": "2024-12-31T23:59:59Z",
      "pricingPlan": {
        "id": "plan-uuid",
        "displayName": "高級會員",
        "membershipTier": "PREMIUM"
      },
      "association": {
        "id": "assoc-uuid",
        "name": "示例協會",
        "slug": "example-association"
      }
    },
    "membership": {
      "id": "member-uuid",
      "tier": "PREMIUM",
      "status": "ACTIVE",
      "renewalDate": "2024-12-31T23:59:59Z",
      "association": {
        "id": "assoc-uuid",
        "name": "示例協會",
        "slug": "example-association"
      }
    },
    "paymentStatus": "PAID",
    "isProcessed": true
  }
}
```

## 🔒 **安全提醒**

### ❌ **絕對不要做的事**
1. **不要嘗試手動觸發 webhook** - 這會破壞 Stripe 的安全機制
2. **不要在前端處理支付邏輯** - 所有支付處理都應該在後端
3. **不要忽略認證** - 所有 API 調用都需要 JWT token
4. **不要無限輪詢** - 設置合理的超時時間

### ✅ **安全最佳實踐**
1. **信任 webhook 處理** - Stripe 會自動調用我們的後端
2. **只查詢狀態** - 前端只負責顯示結果
3. **實現優雅降級** - 處理各種錯誤情況
4. **保護用戶隱私** - 不在前端存儲敏感信息

## 📞 **需要幫助？**

如果遇到問題，請提供：
1. **完整的錯誤信息**
2. **使用的 session_id**
3. **API 請求和響應內容**
4. **瀏覽器開發者工具的 Network 頁籤截圖**

**緊急聯繫：** 後端開發團隊 