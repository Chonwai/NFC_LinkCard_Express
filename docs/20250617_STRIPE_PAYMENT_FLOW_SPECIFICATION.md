# 🎯 Stripe 支付流程業界標準規範（File Name: 20250617_STRIPE_PAYMENT_FLOW_SPECIFICATION.md）

## 📋 概覽

本文檔分析 NFC LinkCard Express 專案中 Stripe Checkout 的支付處理流程，基於業界標準和最佳實踐。

## 🔄 標準 Stripe Checkout 流程

### 1. **支付流程圖**

```
用戶點擊付款 → 前端調用後端 API → 創建 Checkout Session → 重定向到 Stripe
                                    ↓
用戶完成付款 ← Stripe 託管頁面 ← 獲取 session_id 和 URL
    ↓
Stripe 重定向到 success_url?session_id=cs_xxx
    ↓
前端獲取 session_id → 調用後端 API 確認狀態 → 顯示會員激活成功
    ↓                        ↑
Stripe 發送 Webhook (並行) → 後端處理 → 激活會員資格
```

### 2. **時序圖分析**

| 步驟 | 參與者 | 操作 | 關鍵點 |
|------|--------|------|---------|
| 1 | 前端 → 後端 | 創建 Checkout Session | 保存 `orderId` 到 localStorage |
| 2 | 後端 → Stripe | 調用 Stripe API | 設置 `client_reference_id` = orderId |
| 3 | 前端 → Stripe | 重定向到支付頁面 | 用戶在 Stripe 完成付款 |
| 4 | Stripe → 前端 | 重定向到 success_url | **攜帶 `session_id` 參數** |
| 5 | **前端 → 後端** | **確認支付狀態** | **🔥 關鍵步驟：必須調用** |
| 6 | Stripe → 後端 | 發送 Webhook | 並行處理，激活會員 |

## ⚠️ 當前系統問題分析

### 🔍 **問題識別**

1. **缺少通過 session_id 查詢的 API**
   ```typescript
   // ❌ 現狀：前端有 session_id，但無法直接查詢
   // 前端從 URL 獲取：session_id=cs_test_a1EoNZtxzTJHI4VvPZD4FFGbGWj...
   
   // ✅ 需要：通過 session_id 查詢訂單狀態的 API
   GET /api/payment/status/session/{session_id}
   ```

2. **前端缺少狀態確認邏輯**
   ```typescript
   // ❌ 前端目前的做法
   // 用戶付款成功後，沒有調用後端確認狀態
   
   // ✅ 業界標準做法
   // 1. 獲取 session_id
   // 2. 調用 API 確認支付和會員狀態
   // 3. 輪詢等待處理完成
   ```

### 📊 **業界標準對比**

| 標準做法 | 我們現狀 | 改進建議 |
|----------|----------|----------|
| 前端確認支付狀態 | ❌ 缺少 | ✅ 必須添加 |
| 通過 session_id 查詢 | ❌ 不支持 | ✅ 添加 API |
| 輪詢等待 webhook | ❌ 缺少 | ✅ 前端實現 |
| 會員狀態反饋 | ✅ 支持 | ✅ 已完善 |

## 🛠️ 解決方案

### 1. **後端 API 改進**

#### 添加通過 session_id 查詢的方法

```typescript
// src/payment/services/PurchaseOrderService.ts
/**
 * 通過 Stripe Session ID 查詢訂單
 */
async getOrderBySessionId(sessionId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
        where: {
            stripeData: {
                path: ['sessionId'],
                equals: sessionId,
            },
        },
        include: {
            pricingPlan: {
                select: {
                    id: true,
                    name: true,
                    displayName: true,
                    membershipTier: true,
                },
            },
            user: {
                select: {
                    id: true,
                    email: true,
                    username: true,
                    display_name: true,
                },
            },
        },
    });

    if (!order) {
        throw {
            message: '找不到對應的訂單',
            code: 'ORDER_NOT_FOUND',
            status: 404,
        } as ApiError;
    }

    return order;
}
```

#### 添加新的 API 端點

```typescript
// src/payment/controllers/PaymentHelperController.ts
/**
 * 通過 session_id 檢查支付狀態
 * GET /api/payment/status/session/{session_id}
 */
checkPaymentStatusBySession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const order = await this.purchaseOrderService.getOrderBySessionId(sessionId);

        return ApiResponse.success(res, {
            orderId: order.id,
            sessionId: sessionId,
            paymentStatus: order.status,
            membershipStatus: order.status === 'PAID' ? 'ACTIVE' : 'PENDING',
            membershipStartDate: order.membershipStartDate,
            membershipEndDate: order.membershipEndDate,
            amount: order.amount,
            currency: order.currency,
            paidAt: order.paidAt,
            association: {
                id: order.associationId,
                name: order.pricingPlan?.displayName,
                tier: order.pricingPlan?.membershipTier,
            },
        });
    } catch (error: unknown) {
        const apiError = error as ApiError;
        return ApiResponse.error(
            res,
            '查詢支付狀態失敗',
            'PAYMENT_STATUS_CHECK_ERROR',
            apiError.message,
            apiError.status || 404,
        );
    }
};
```

### 2. **前端標準實現**

#### Success 頁面完整處理邏輯

```typescript
// pages/payment/success.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface PaymentStatus {
  orderId: string;
  sessionId: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  membershipStatus: 'PENDING' | 'ACTIVE';
  membershipStartDate?: string;
  membershipEndDate?: string;
  association: {
    name: string;
    tier: string;
  };
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'processing'>('loading');
  const [paymentData, setPaymentData] = useState<PaymentStatus | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 30; // 最多輪詢 30 次 (約 1 分鐘)

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      setStatus('error');
      return;
    }

    checkPaymentStatus(sessionId);
  }, [searchParams]);

  const checkPaymentStatus = async (sessionId: string) => {
    try {
      const token = getCookie('authToken');
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/status/session/${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('API 請求失敗');
      }

      const { data } = await response.json();
      setPaymentData(data);

      if (data.paymentStatus === 'PAID' && data.membershipStatus === 'ACTIVE') {
        // 🎉 支付成功且會員已激活
        setStatus('success');
      } else if (data.paymentStatus === 'PAID' && data.membershipStatus === 'PENDING') {
        // ⏳ 支付成功但會員還在處理中
        setStatus('processing');
        
        // 繼續輪詢直到會員激活
        if (retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            checkPaymentStatus(sessionId);
          }, 2000); // 每 2 秒檢查一次
        } else {
          setStatus('error'); // 超時
        }
      } else if (data.paymentStatus === 'FAILED') {
        setStatus('error');
      } else {
        // 還在處理中
        setStatus('processing');
        
        if (retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            checkPaymentStatus(sessionId);
          }, 2000);
        } else {
          setStatus('error');
        }
      }
    } catch (error) {
      console.error('檢查支付狀態失敗:', error);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="payment-status-container">
        <div className="loading-spinner" />
        <h2>正在確認支付狀態...</h2>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="payment-status-container">
        <div className="processing-spinner" />
        <h2>支付成功！正在激活會員資格...</h2>
        <p>請稍候，我們正在處理您的會員權益 ({retryCount}/{maxRetries})</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="payment-status-container error">
        <h2>❌ 支付驗證失敗</h2>
        <p>請聯繫客服或重試支付</p>
        <button onClick={() => window.location.href = '/pricing'}>
          重新購買
        </button>
      </div>
    );
  }

  // status === 'success'
  return (
    <div className="payment-status-container success">
      <h1>🎉 付款成功！</h1>
      <p>恭喜您成功購買 <strong>{paymentData?.association.name}</strong> 會員資格</p>
      
      <div className="purchase-details">
        <h3>購買詳情</h3>
        <p><strong>訂單編號:</strong> {paymentData?.orderId}</p>
        <p><strong>會員等級:</strong> {paymentData?.association.tier}</p>
        <p><strong>生效日期:</strong> {paymentData?.membershipStartDate}</p>
        <p><strong>到期日期:</strong> {paymentData?.membershipEndDate}</p>
      </div>

      <div className="next-steps">
        <h3>接下來</h3>
        <button onClick={() => window.location.href = '/dashboard'}>
          🏠 回到首頁
        </button>
        <button onClick={() => window.location.href = '/profile'}>
          👤 查看我的會員資格
        </button>
      </div>
    </div>
  );
}
```

#### 創建支付時保存 orderId

```typescript
// 創建支付時的處理
const handlePayment = async (pricingPlanId: string) => {
  try {
    const response = await fetch('/api/payment/purchase-orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pricingPlanId,
        successUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
      }),
    });

    const { data } = await response.json();
    
    // 🔥 重要：保存 orderId 作為備用
    localStorage.setItem('currentOrderId', data.order.id);
    localStorage.setItem('paymentStartTime', Date.now().toString());
    
    // 重定向到 Stripe
    window.location.href = data.checkoutUrl;
  } catch (error) {
    console.error('創建支付失敗:', error);
  }
};
```

## 🚀 實施建議

### **Phase 1: 後端 API 改進** (優先)

1. ✅ 添加 `getOrderBySessionId` 方法
2. ✅ 添加 `GET /api/payment/status/session/{sessionId}` 端點
3. ✅ 更新路由配置

### **Phase 2: 前端集成** (必須)

1. ✅ 實現 success 頁面狀態確認邏輯
2. ✅ 添加輪詢機制等待 webhook 處理
3. ✅ 改善用戶體驗和錯誤處理
4. ✅ 添加支付狀態的 UI 反饋

### **Phase 3: 測試驗證**

1. ✅ 測試完整的支付流程
2. ✅ 驗證 webhook 和 API 的並行處理
3. ✅ 確認會員狀態正確激活

## 📊 業界對比

| 公司 | 處理方式 | 我們的方案 |
|------|----------|------------|
| **Stripe 官方建議** | 前端確認 + Webhook 處理 | ✅ 完全符合 |
| **Shopify** | Session 查詢 + 狀態輪詢 | ✅ 實現相同邏輯 |
| **GitHub** | 重定向確認 + 並行處理 | ✅ 採用最佳實踐 |

## 💡 總結

**前端在 Stripe Checkout 成功後必須調用我們的 API** 來確認支付和會員狀態。這是業界標準做法，確保：

1. **支付狀態確認** - 驗證 Stripe 支付真正成功
2. **會員狀態同步** - 確認會員權益已正確激活  
3. **用戶體驗** - 即時反饋給用戶處理狀態
4. **數據一致性** - 前後端狀態保持同步

我們的系統架構已經非常完善，只需要添加通過 `session_id` 查詢的 API 方法，就能完全符合業界標準！ 