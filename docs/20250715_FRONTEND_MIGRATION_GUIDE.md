# 前端API遷移指南：從Lead系統到PurchaseIntentData系統（File Name: 20250715_FRONTEND_MIGRATION_GUIDE.md）

## 📋 概述

本文檔指導前端工程師將購買流程相關的API從舊的Lead系統遷移到新的PurchaseIntentData系統。這次遷移的主要目的是**解決購買意向數據錯誤關聯到CRM Lead系統的問題**。

## 🚨 重要變更

### 核心問題
之前系統將**購買意向數據**和**CRM潛在客戶管理**混在同一個`AssociationLead`表中，導致：
1. 購買流程中的用戶數據被錯誤分類為CRM Lead
2. 購買完成後無法正確找到相關的用戶資料來創建Profile
3. 數據管理混亂，影響業務分析

### 解決方案
- 創建專門的`PurchaseIntentData`表處理購買相關數據
- 保持`AssociationLead`專門用於CRM管理
- 提供新的API端點處理購買意向數據
- 保持API響應格式兼容，前端修改最小化

## 🔄 需要遷移的API

### 1. 創建購買意向數據 🚨 **必須遷移**

#### ❌ 舊API (需要停用)
```http
POST /api/association/associations/{associationId}/leads
```

#### ✅ 新API (推薦使用)
```http
POST /api/association/associations/{associationId}/purchase-intents
```

**請求格式保持相同：**
```json
{
    "firstName": "Edison",
    "lastName": "UN",
    "email": "edison@example.com", 
    "phone": "+853-1234-5678",
    "organization": "Travel J",
    "message": "購買意向: 高級會員 (PREMIUM)",
    "purchaseContext": {
        "associationId": "8ca24b76-465b-44db-aa2c-eb471720404d",
        "pricingPlanId": "plan-uuid",
        "planName": "高級會員",
        "amount": 1000,
        "currency": "HKD"
    }
}
```

**響應格式保持兼容：**
```json
{
    "success": true,
    "data": {
        "message": "您的購買意向已成功提交，請繼續完成註冊和付款流程",
        "lead": {
            "id": "purchase-intent-uuid",
            "firstName": "Edison",
            "lastName": "UN", 
            "email": "edison@example.com",
            "phone": "+853-1234-5678",
            "organization": "Travel J",
            "message": "購買意向: 高級會員 (PREMIUM)",
            "source": "PURCHASE_INTENT",
            "status": "NEW",
            "priority": "HIGH",
            "createdAt": "2024-01-15T10:00:00Z"
        }
    }
}
```

### 2. Profile預填API ✅ **無需修改**

#### ✅ 已更新 (內部邏輯已改，API接口不變)
```http
GET /api/association/associations/{associationId}/profile-prefill/{userId}?orderId={orderId}
```

**說明：** 此API內部邏輯已修改為使用PurchaseIntentData，但API接口保持不變，前端無需修改。

## 🔧 前端代碼修改示例

### 修改 `lib/association/leads.ts`

```typescript
// ❌ 舊的實現
export async function createAssociationLead(associationId: string, leadData: any) {
    const response = await fetch(`/api/association/associations/${associationId}/leads`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
    });
    
    return response.json();
}

// ✅ 新的實現 (推薦)
export async function createPurchaseIntent(associationId: string, purchaseIntentData: any) {
    const response = await fetch(`/api/association/associations/${associationId}/purchase-intents`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseIntentData),
    });
    
    return response.json();
}

// 🔄 向後兼容的過渡方案
export async function createAssociationLead(associationId: string, leadData: any) {
    // 如果是購買流程，使用新API
    if (leadData.purchaseContext) {
        return createPurchaseIntent(associationId, leadData);
    }
    
    // 如果是純CRM Lead，使用舊API
    const response = await fetch(`/api/association/associations/${associationId}/leads`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
    });
    
    return response.json();
}
```

### 修改購買流程組件

```typescript
// 在 CheckoutClient.tsx 或類似組件中

// ❌ 舊的調用方式
const handleSubmitPurchaseIntent = async (formData: any) => {
    try {
        const result = await createAssociationLead(associationId, {
            ...formData,
            source: 'PURCHASE_INTENT'
        });
        
        // 處理結果...
    } catch (error) {
        // 錯誤處理...
    }
};

// ✅ 新的調用方式 (推薦)
const handleSubmitPurchaseIntent = async (formData: any) => {
    try {
        const result = await createPurchaseIntent(associationId, {
            ...formData,
            purchaseContext: {
                associationId,
                pricingPlanId: selectedPlan.id,
                planName: selectedPlan.name,
                amount: selectedPlan.price,
                currency: selectedPlan.currency
            }
        });
        
        // 處理結果...
    } catch (error) {
        // 錯誤處理...
    }
};
```

## 📊 新增功能API

### 獲取用戶購買意向記錄
```http
GET /api/association/associations/{associationId}/purchase-intents/user
Authorization: Bearer {token}
```

### 根據郵箱查找購買意向
```http
GET /api/association/associations/{associationId}/purchase-intents/find-by-email?email={email}
```

## ⚡ 遷移策略

### 階段1：漸進式遷移 (推薦)

1. **保持舊API正常運作** - CRM功能繼續使用
2. **更新購買流程** - 使用新的purchase-intents API
3. **測試驗證** - 確認新API功能正常
4. **逐步替換** - 將所有購買相關調用遷移到新API

### 階段2：完全分離

1. **購買流程** → 使用 `/purchase-intents` API
2. **CRM管理** → 繼續使用 `/leads` API
3. **數據分析** → 基於正確的數據分類

## 🧪 測試驗證

### 測試購買意向API
```bash
# 創建購買意向
curl -X POST http://localhost:3020/api/association/associations/{associationId}/purchase-intents \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User", 
    "email": "test@example.com",
    "purchaseContext": {
      "associationId": "{associationId}",
      "pricingPlanId": "{planId}",
      "planName": "基礎會員",
      "amount": 500,
      "currency": "HKD"
    }
  }'

# 獲取用戶購買意向
curl -X GET "http://localhost:3020/api/association/associations/{associationId}/purchase-intents/user" \
  -H "Authorization: Bearer {token}"
```

### 測試Profile預填API (應該繼續正常工作)
```bash
curl -X GET "http://localhost:3020/api/association/associations/{associationId}/profile-prefill/{userId}?orderId={orderId}" \
  -H "Authorization: Bearer {token}"
```

## 🔍 數據流對比

### ❌ 舊的數據流 (有問題)
```
Purchase Intent → AssociationLead → Profile Creation (錯誤關聯)
CRM Lead       → AssociationLead → Profile Creation (混淆)
```

### ✅ 新的數據流 (正確)
```
Purchase Intent → PurchaseIntentData → Profile Creation ✅
CRM Lead       → AssociationLead    → CRM Management  ✅
```

## ⚠️ 注意事項

1. **響應格式兼容** - 新API返回的數據格式與舊API相同，減少前端修改
2. **ID更改** - 新API返回的`lead.id`實際上是`purchaseIntentData.id`
3. **數據隔離** - 購買意向數據和CRM Lead完全分離
4. **過期機制** - 購買意向數據有30天過期期限
5. **自動關聯** - 支付成功後自動關聯訂單

## 📞 技術支持

如有任何問題，請聯繫：
- **後端團隊** - API實現和數據結構問題
- **前端團隊** - 集成和用戶體驗問題  
- **產品團隊** - 業務邏輯和需求澄清

## 📅 遷移時間表

| 階段 | 時間 | 任務 | 負責人 |
|------|------|------|--------|
| 1 | Week 1 | 後端API實現完成 | 後端團隊 |
| 2 | Week 2 | 前端API集成測試 | 前端團隊 |
| 3 | Week 3 | 用戶接受測試 | 產品+QA |
| 4 | Week 4 | 生產環境部署 | DevOps |

---

**最後更新:** 2024-01-22  
**版本:** 1.0  
**狀態:** 準備實施 