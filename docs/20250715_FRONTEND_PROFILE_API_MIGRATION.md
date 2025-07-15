# 前端 Profile API 遷移指南：自動創建 Links 功能（File Name: 20250715_FRONTEND_PROFILE_API_MIGRATION.md）

## 📋 概述

為了解決**用戶 Profile 缺少自動創建的 email 和 phone Links**問題，我們需要將前端的 Profile 創建 API 從舊端點遷移到新端點。

### 🚨 關鍵問題
**當前問題**：使用舊 API 創建的 Profile 沒有自動生成 email、phone、organization 的 Links
**解決方案**：使用新 API 端點，系統會根據購買意向數據自動創建相應的 Links

---

## 🔄 API 端點對比

### ❌ 舊 API（不推薦）
```http
POST /api/association/associations/{associationId}/profiles
```
**問題**：
- 只創建基本 Profile 和協會徽章
- **不會**自動創建 email、phone Links
- 用戶需要手動添加聯絡方式

### ✅ 新 API（推薦）
```http
POST /api/association/associations/{associationId}/profiles/with-lead-data
```
**優勢**：
- 創建 Profile 和協會徽章
- **自動創建** email、phone、organization Links
- 基於購買意向數據預填用戶聯絡方式
- 更好的用戶體驗

---

## 📊 功能對比表

| 功能 | 舊 API `/profiles` | 新 API `/profiles/with-lead-data` |
|------|-------------------|-----------------------------------|
| 創建 Profile | ✅ | ✅ |
| 添加協會徽章 | ✅ | ✅ |
| 設置 Profile 描述 | ✅ | ✅ |
| 自動創建 Email Link | ❌ | ✅ `mailto:user@example.com` |
| 自動創建 Phone Link | ❌ | ✅ `tel:+853-12345678` |
| 自動創建 Organization Link | ❌ | ✅ 如果是 URL 則創建網站 Link |
| 數據來源 | 手動輸入 | 購買意向數據自動預填 |

---

## 🔧 遷移步驟

### 1. 更新 API 端點

```typescript
// ❌ 舊的實現
const createProfile = async (associationId: string, profileData: any) => {
    const response = await fetch(`/api/association/associations/${associationId}/profiles`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
    });
    return response.json();
};

// ✅ 新的實現
const createProfileWithLinks = async (associationId: string, profileData: any) => {
    const response = await fetch(`/api/association/associations/${associationId}/profiles/with-lead-data`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
    });
    return response.json();
};
```

### 2. 更新請求參數

**舊 API 請求格式**：
```typescript
{
    name: string;
    description?: string;
    isPublic?: boolean;
    customization?: {
        associationBadge?: boolean;
        associationTheme?: boolean;
    };
}
```

**新 API 請求格式**：
```typescript
{
    name: string;
    description?: string;
    isPublic?: boolean;
    orderId: string;        // 🆕 必須：購買訂單ID
    leadId?: string;        // 🆕 可選：購買意向數據ID
    customization?: {
        associationBadge?: boolean;
        associationTheme?: boolean;
    };
}
```

### 3. 處理新的響應格式

**新 API 額外返回的數據**：
```typescript
{
    success: true,
    data: {
        profile: { ... },           // 原有的 Profile 數據
        badge: { ... },             // 原有的徽章數據
        links: [                    // 🆕 自動創建的 Links
            {
                id: string;
                title: string;
                url: string;
                platform: "EMAIL" | "PHONE" | "WEBSITE";
                isActive: boolean;
                createdFrom: "LEAD_PREFILL";
            }
        ],
        summary: {                  // 🆕 創建總結
            linksCreated: number;
            linkTypes: string[];
        }
    }
}
```

---

## 💻 完整代碼示例

### React 組件更新

```typescript
// ProfileCreationForm.tsx
import { useState } from 'react';

interface ProfileCreationProps {
    associationId: string;
    orderId: string;           // 🆕 從支付成功頁面傳入
    purchaseIntentId?: string; // 🆕 可選的購買意向數據ID
}

const ProfileCreationForm: React.FC<ProfileCreationProps> = ({ 
    associationId, 
    orderId, 
    purchaseIntentId 
}) => {
    const [profileData, setProfileData] = useState({
        name: '',
        description: '',
        isPublic: true,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [createdLinks, setCreatedLinks] = useState([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // ✅ 使用新 API
            const response = await fetch(
                `/api/association/associations/${associationId}/profiles/with-lead-data`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...profileData,
                        orderId,                    // 🆕 必須參數
                        leadId: purchaseIntentId,   // 🆕 可選參數
                        customization: {
                            associationBadge: true,
                            associationTheme: true,
                        },
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // 🎉 顯示創建成功信息
                console.log('✅ Profile 創建成功！');
                console.log(`📋 自動創建了 ${result.data.summary.linksCreated} 個 Links`);
                console.log(`🔗 Links 類型: ${result.data.summary.linkTypes.join(', ')}`);
                
                // 保存創建的 Links 信息
                setCreatedLinks(result.data.links);
                
                // 跳轉到 Profile 頁面
                window.location.href = result.data.profile.url;
            }
        } catch (error) {
            console.error('❌ Profile 創建失敗:', error);
            alert('創建失敗，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Profile 名稱</label>
                <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    required
                />
            </div>
            
            <div>
                <label>描述</label>
                <textarea
                    value={profileData.description}
                    onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                />
            </div>

            <button type="submit" disabled={isLoading}>
                {isLoading ? '創建中...' : '創建 Profile'}
            </button>

            {/* 🆕 顯示將要創建的 Links 預覽 */}
            {createdLinks.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 rounded">
                    <h3>🎉 自動創建的聯絡方式：</h3>
                    <ul>
                        {createdLinks.map((link, index) => (
                            <li key={index}>
                                📎 {link.title}: {link.url}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </form>
    );
};
```

### API 服務層更新

```typescript
// services/profileService.ts

interface CreateProfileRequest {
    name: string;
    description?: string;
    isPublic?: boolean;
    orderId: string;        // 🆕 必須
    leadId?: string;        // 🆕 可選
    customization?: {
        associationBadge?: boolean;
        associationTheme?: boolean;
    };
}

interface CreateProfileResponse {
    success: boolean;
    data: {
        profile: {
            id: string;
            name: string;
            slug: string;
            description?: string;
            isPublic: boolean;
            url: string;
        };
        badge?: {
            id: string;
            isVisible: boolean;
            displayMode: string;
        };
        links: Array<{                    // 🆕 自動創建的 Links
            id: string;
            title: string;
            url: string;
            platform: string;
            isActive: boolean;
            createdFrom: string;
        }>;
        summary: {                        // 🆕 創建總結
            linksCreated: number;
            linkTypes: string[];
        };
    };
}

export class ProfileService {
    // ✅ 新的 Profile 創建方法
    static async createProfileWithAutoLinks(
        associationId: string, 
        profileData: CreateProfileRequest
    ): Promise<CreateProfileResponse> {
        const response = await fetch(
            `/api/association/associations/${associationId}/profiles/with-lead-data`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AuthService.getToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    // 🔄 向後兼容的包裝方法
    static async createProfile(
        associationId: string, 
        profileData: any,
        orderId?: string,
        leadId?: string
    ) {
        if (orderId) {
            // 如果有 orderId，使用新 API（推薦）
            return this.createProfileWithAutoLinks(associationId, {
                ...profileData,
                orderId,
                leadId,
            });
        } else {
            // 否則使用舊 API（不推薦）
            console.warn('⚠️ 使用舊 API，不會自動創建 Links');
            // ... 舊 API 調用邏輯
        }
    }
}
```

---

## 🧪 測試驗證

### 1. 手動測試

```bash
# 測試新 API 端點
curl -X POST "http://localhost:3020/api/association/associations/{associationId}/profiles/with-lead-data" \
  -H "Authorization: Bearer {your-jwt-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "測試 Profile",
    "description": "測試自動創建 Links",
    "orderId": "{your-order-id}",
    "isPublic": true,
    "customization": {
      "associationBadge": true
    }
  }'
```

### 2. 驗證 Links 創建

成功響應應該包含：
```json
{
  "success": true,
  "data": {
    "links": [
      {
        "title": "電子郵件",
        "url": "mailto:user@example.com",
        "platform": "EMAIL",
        "isActive": true,
        "createdFrom": "LEAD_PREFILL"
      },
      {
        "title": "電話", 
        "url": "tel:+853-12345678",
        "platform": "PHONE",
        "isActive": true,
        "createdFrom": "LEAD_PREFILL"
      }
    ],
    "summary": {
      "linksCreated": 2,
      "linkTypes": ["EMAIL", "PHONE"]
    }
  }
}
```

---

## 📝 注意事項

### 必須參數
1. **`orderId`**：購買訂單 ID，用於查找購買意向數據
2. **`Authorization`**：用戶必須登錄並有權限

### 可選優化
1. **`leadId`**：如果知道具體的購買意向數據 ID，可以直接指定
2. **錯誤處理**：新 API 可能返回的特定錯誤

### 向後兼容
- 舊 API 仍然可用，但不會自動創建 Links
- 可以保留舊 API 作為 fallback，但建議提示用戶功能限制

---

## ✅ 遷移檢查清單

- [ ] 更新 API 端點 URL
- [ ] 添加 `orderId` 參數到請求 body
- [ ] 更新響應處理邏輯（處理新的 `links` 和 `summary` 字段）
- [ ] 更新錯誤處理
- [ ] 測試自動 Links 創建功能
- [ ] 更新用戶界面顯示創建的 Links
- [ ] 通知用戶新功能的可用性

---

## 🚀 立即可用

新 API 已經完全實現並經過測試，前端只需要按照本文檔進行遷移即可立即使用自動 Links 創建功能！

**效果**：用戶創建 Profile 後會自動看到 email 和 phone Links，無需手動添加。🎉 