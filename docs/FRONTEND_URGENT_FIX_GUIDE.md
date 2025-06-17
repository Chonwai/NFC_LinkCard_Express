# 前端工程師緊急修復指南

## 🚨 **立即停止使用這些錯誤的端點**

```javascript
// ❌ 錯誤的端點 - 立即停止使用
// POST /api/payments/webhook/checkout-completed
// GET /api/stripe/manual-sync
// POST /api/payments/create-intent
```

## ✅ **正確的 API 端點和流程**

### 1. 獲取協會的定價方案
```javascript
async function getAssociationPricingPlans(associationId) {
  const response = await fetch(`/api/payment/pricing-plans/association/${associationId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!response.ok) {
    throw new Error('獲取定價方案失敗');
  }
  
  const data = await response.json();
  return data.data.plans;
}
```

### 2. 創建購買訂單並跳轉支付
```javascript
async function purchaseMembership(pricingPlanId) {
  try {
    const response = await fetch('/api/payment/purchase-orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pricingPlanId: pricingPlanId,
        successUrl: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/payment/cancel`
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '創建訂單失敗');
    }

    const { data } = await response.json();
    const { order, checkoutUrl } = data;
    
    // 保存訂單ID到本地存儲（可選）
    localStorage.setItem('currentOrderId', order.id);
    
    // 跳轉到 Stripe Checkout
    window.location.href = checkoutUrl;
    
  } catch (error) {
    console.error('購買失敗:', error);
    alert('購買失敗: ' + error.message);
  }
}
```

### 3. 支付成功頁面 - 驗證支付結果
```javascript
// 在支付成功頁面 (例如 /payment/success)
async function verifyPaymentSuccess() {
  // 從 URL 獲取 session_id
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  
  if (!sessionId) {
    alert('缺少支付會話ID');
    return;
  }

  try {
    const response = await fetch(`/api/payment/purchase-orders/status/session/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('查詢支付狀態失敗');
    }

    const { data } = await response.json();
    const { order, membership, paymentStatus } = data;

    if (paymentStatus === 'PAID') {
      // 支付成功，顯示成功信息
      displaySuccessMessage(order, membership);
    } else {
      // 支付還在處理中
      displayProcessingMessage();
    }

  } catch (error) {
    console.error('驗證支付失敗:', error);
    alert('驗證支付狀態失敗: ' + error.message);
  }
}

function displaySuccessMessage(order, membership) {
  document.getElementById('success-message').innerHTML = `
    <h2>🎉 支付成功！</h2>
    <p>訂單號：${order.orderNumber}</p>
    <p>會員等級：${order.pricingPlan.displayName}</p>
    <p>協會：${order.association.name}</p>
    ${membership ? `<p>會員狀態：${membership.status}</p>` : ''}
  `;
}
```

### 4. 檢查會員狀態
```javascript
async function checkMembershipStatus(associationId) {
  try {
    const response = await fetch(`/api/association/associations/${associationId}/check-membership`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('查詢會員狀態失敗');
    }

    const { data } = await response.json();
    return data;

  } catch (error) {
    console.error('查詢會員狀態失敗:', error);
    return null;
  }
}
```

## 🔧 **完整的購買流程示例**

```html
<!DOCTYPE html>
<html>
<head>
    <title>會員購買</title>
</head>
<body>
    <div id="pricing-plans"></div>
    <div id="success-message" style="display: none;"></div>

    <script>
        // 頁面加載時獲取定價方案
        document.addEventListener('DOMContentLoaded', async () => {
            const associationId = 'your-association-id'; // 替換為實際的協會ID
            
            try {
                const plans = await getAssociationPricingPlans(associationId);
                displayPricingPlans(plans);
            } catch (error) {
                console.error('載入定價方案失敗:', error);
            }
        });

        function displayPricingPlans(plans) {
            const container = document.getElementById('pricing-plans');
            container.innerHTML = plans.map(plan => `
                <div class="pricing-plan">
                    <h3>${plan.displayName}</h3>
                    <p>${plan.description || ''}</p>
                    <p>價格: ${plan.currency} ${plan.price}</p>
                    <button onclick="purchaseMembership('${plan.id}')">
                        購買 ${plan.displayName}
                    </button>
                </div>
            `).join('');
        }

        // 在這裡添加上面的函數定義
        // getAssociationPricingPlans(), purchaseMembership(), etc.
    </script>
</body>
</html>
```

## 🚀 **立即測試步驟**

### 1. 替換你的代碼
1. 找到你現在調用 `/api/payments/*` 的代碼
2. 替換為上面的正確實現
3. 確保使用正確的 Authorization header

### 2. 測試創建訂單
```javascript
// 在瀏覽器控制台運行這個測試
async function testCreateOrder() {
  const response = await fetch('/api/payment/purchase-orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pricingPlanId: 'test-plan-id', // 替換為實際的定價方案ID
      successUrl: window.location.origin + '/payment/success',
      cancelUrl: window.location.origin + '/payment/cancel'
    })
  });
  
  console.log('Response status:', response.status);
  const data = await response.json();
  console.log('Response data:', data);
}

testCreateOrder();
```

### 3. 檢查服務器日誌
- 運行測試後，檢查後端服務器日誌
- 應該能看到 "🔍 創建購買訂單請求" 的日誌
- 如果看到 "✅ 購買訂單創建成功"，說明成功了

### 4. 檢查數據庫
```sql
-- 在數據庫中運行這個查詢
SELECT * FROM purchase_orders ORDER BY created_at DESC LIMIT 5;
```
- 應該能看到新創建的訂單記錄

## 🆘 **如果還是有問題**

### 檢查認證
```javascript
// 檢查 token 是否有效
async function checkAuth() {
  const token = localStorage.getItem('token');
  console.log('Token:', token ? '存在' : '不存在');
  
  if (token) {
    // 測試一個需要認證的端點
    const response = await fetch('/api/auth/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Auth status:', response.status);
  }
}
```

### 檢查定價方案
```javascript
// 確保有可用的定價方案
async function listPricingPlans(associationId) {
  const response = await fetch(`/api/payment/pricing-plans/association/${associationId}`);
  const data = await response.json();
  console.log('Available plans:', data);
}
```

## 📞 **緊急聯繫**

如果按照上述步驟操作後仍有問題：

1. **立即聯繫後端工程師**進行聯合調試
2. **提供以下信息**：
   - 瀏覽器控制台的錯誤信息
   - 網絡面板中的請求和響應
   - 使用的 token 是否有效
   - 使用的 associationId 和 pricingPlanId

3. **準備進行實時調試**：
   - 後端工程師監控服務器日誌
   - 前端工程師在瀏覽器中執行測試
   - 一起驗證數據庫狀態

## ✅ **成功的標誌**

當一切正常工作時，你應該看到：
1. ✅ API 調用返回 200 狀態碼
2. ✅ 響應包含 `order` 和 `checkoutUrl`
3. ✅ 數據庫中出現新的 `purchase_orders` 記錄
4. ✅ 能夠跳轉到 Stripe Checkout 頁面
5. ✅ 支付完成後能查詢到正確的訂單狀態 