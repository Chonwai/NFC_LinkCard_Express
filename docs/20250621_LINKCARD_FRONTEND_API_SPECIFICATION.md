# LinkCard 後端 API 規範 - 付款後創建協會專屬 Profile（File Name: 20250621_LINKCARD_FRONTEND_API_SPECIFICATION.md）

## 概述

本文檔描述了「付款成功後引導用戶創建協會專屬 Profile」功能的後端 API 規範。該功能已經實現並經過測試，前端可以直接使用。

## 關鍵改進

與前端原始需求的對比：
- ✅ **API路徑完全匹配**：`POST /api/association/associations/{associationId}/profiles`
- ✅ **付款狀態查詢已增強**：包含 `associationId` 字段
- ✅ **支持customization配置**：包含協會徽章、主題、品牌等設置
- ✅ **自動徽章添加**：創建Profile時自動添加協會徽章
- ✅ **完整的權限驗證**：確保用戶是協會成員

## 技術背景

**前端項目架構：**
- Next.js 14+ App Router + TypeScript + TailwindCSS
- 通過 `NEXT_PUBLIC_API_URL` 環境變量連接後端服務
- 協會版 API 基礎路徑：`${NEXT_PUBLIC_API_URL}/api/association`

**API 狀況：**
- ✅ 付款狀態查詢API已實現（包含associationId）
- ✅ 協會Profile創建API已實現（支持customization）
- ✅ 用戶資料查詢API已實現
- ✅ 自動徽章添加功能已實現

## 功能流程

### 業務場景
用戶通過付款成為協會會員後，在付款成功頁面可以選擇：
1. 立即創建協會專屬 Profile（推薦）
2. 稍後再創建

### 用戶體驗流程
1. 用戶完成 Stripe 付款
2. 跳轉到成功頁面：`/success?session_id=xxx`
3. 查詢付款狀態，確認是協會會員購買
4. 顯示 Profile 創建提示界面
5. 用戶選擇創建 → 調用 `createAssociationProfile` API
6. 成功創建後跳轉到 Profile 編輯頁面

## API 端點規範

### 1. 付款狀態查詢 API ✅

**端點：** `GET /api/payment/purchase-orders/payment-status/{sessionId}`

**請求格式：**
```http
GET /api/payment/purchase-orders/payment-status/cs_test_123456
Authorization: Bearer {jwt_token}
```

**響應格式：**
```json
{
    "success": true,
    "data": {
        "order": {
            "id": "ord_12345",
            "orderNumber": "ORDER-ABC123",
            "status": "PAID",
            "associationId": "assoc_456",
            "amount": 100.00,
            "currency": "HKD",
            "paidAt": "2024-01-15T10:30:00Z",
            "membershipStartDate": "2024-01-15T10:30:00Z",
            "membershipEndDate": "2025-01-15T10:30:00Z",
            "pricingPlan": {
                "id": "plan_123",
                "displayName": "基礎會員",
                "membershipTier": "BASIC"
            },
            "association": {
                "id": "assoc_456",
                "name": "台灣軟體工程師協會",
                "slug": "taiwan-software-engineers"
            }
        },
        "membership": {
            "id": "member_789",
            "tier": "BASIC",
            "status": "ACTIVE",
            "renewalDate": "2025-01-15T10:30:00Z",
            "association": {
                "id": "assoc_456",
                "name": "台灣軟體工程師協會",
                "slug": "taiwan-software-engineers"
            }
        },
        "paymentStatus": "PAID",
        "isProcessed": true
    }
}
```

**錯誤響應：**
```json
{
    "success": false,
    "error": {
        "message": "找不到對應的支付記錄",
        "code": "ORDER_NOT_FOUND"
    }
}
```

### 2. 協會專屬 Profile 創建 API ✅

**端點：** `POST /api/association/associations/{associationId}/profiles`

**請求格式：**
```http
POST /api/association/associations/assoc_456/profiles
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
    "name": "台灣軟體工程師協會 - 張三",
    "description": "Member of 台灣軟體工程師協會",
    "isPublic": true,
    "customization": {
        "associationBadge": true,
        "associationTheme": true,
        "associationBranding": "台灣軟體工程師協會",
        "profileType": "ASSOCIATION_MEMBER"
    }
}
```

**請求參數說明：**
- `name` (可選): Profile名稱，如未提供將自動生成
- `description` (可選): Profile描述，如未提供將自動生成  
- `isPublic` (可選): 是否公開，默認true
- `customization` (可選): 協會專屬配置
  - `associationBadge` (可選): 是否添加協會徽章，默認true
  - `associationTheme` (可選): 是否應用協會主題，默認true
  - `associationBranding` (可選): 協會品牌名稱，默認使用協會名稱
  - `profileType` (可選): Profile類型，默認"ASSOCIATION_MEMBER"

**響應格式：**
```json
{
    "success": true,
    "data": {
        "profile": {
            "id": "prof_123",
            "name": "台灣軟體工程師協會 - 張三",
            "slug": "taiwan-software-engineers-8x2n9f4k",
            "description": "Member of 台灣軟體工程師協會",
            "profile_image": null,
            "is_public": true,
            "is_default": false,
            "enable_lead_capture": false,
            "customization": {
                "associationBadge": true,
                "associationTheme": true,
                "associationBranding": "台灣軟體工程師協會",
                "profileType": "ASSOCIATION_MEMBER"
            },
            "badges": [
                {
                    "id": "badge_789",
                    "associationId": "assoc_456",
                    "associationName": "台灣軟體工程師協會",
                    "logo": "https://example.com/logo.png",
                    "color": "#3B82F6"
                }
            ],
            "meta": {
                "associationId": "assoc_456",
                "isAssociationProfile": true
            },
            "created_at": "2024-01-15T10:30:00Z",
            "updated_at": "2024-01-15T10:30:00Z"
        }
    }
}
```

**自動功能：**
1. ✅ 驗證用戶是該協會的有效會員
2. ✅ 檢查用戶是否已有該協會的專屬 Profile（避免重複創建）
3. ✅ 自動添加協會徽章到 Profile（如果 `associationBadge: true`）
4. ✅ 生成唯一的 slug
5. ✅ 設置協會專屬的 customization 屬性
6. ✅ 應用協會主題和品牌設定

**錯誤響應：**
```json
{
    "success": false,
    "error": {
        "message": "用戶不是協會成員",
        "code": "NOT_MEMBER"
    }
}
```

### 3. 用戶資料查詢 API

**端點：** `GET /api/users/me`

**請求格式：**
```http
GET /api/users/me
Authorization: Bearer {jwt_token}
```

**響應格式：**
```json
{
    "success": true,
    "data": {
        "user": {
            "id": "user_123",
            "email": "user@example.com",
            "username": "user123",
            "display_name": "張三"
        }
    }
}
```

## 前端實現示例

### TypeScript 類型定義

```typescript
// API 響應類型
interface PaymentStatusResponse {
    success: boolean;
    data: {
        order: {
            id: string;
            orderNumber: string;
            status: string;
            associationId: string; // 前端需要的關鍵字段
            association: {
                id: string;
                name: string;
                slug: string;
            };
        };
        membership: {
            id: string;
            tier: string;
            status: string;
        };
        paymentStatus: string;
        isProcessed: boolean;
    };
}

interface CustomizationRequest {
    associationBadge?: boolean;
    associationTheme?: boolean;
    associationBranding?: string;
    profileType?: string;
}

interface CreateProfileRequest {
    name?: string;
    description?: string;
    isPublic?: boolean;
    customization?: CustomizationRequest;
}

interface ProfileCreationResponse {
    success: boolean;
    data: {
        profile: {
            id: string;
            name: string;
            slug: string;
            description: string;
            is_public: boolean;
            customization: {
                associationBadge: boolean;
                associationTheme: boolean;
                associationBranding: string;
                profileType: string;
            };
            badges: Array<{
                id: string;
                associationId: string;
                associationName: string;
                logo: string;
                color: string;
            }>;
            meta: {
                associationId: string;
                isAssociationProfile: boolean;
            };
        };
    };
}
```

### API 調用示例

```typescript
// 1. 查詢付款狀態
async function getPaymentStatus(sessionId: string): Promise<PaymentStatusResponse> {
    const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payment/purchase-orders/payment-status/${sessionId}`,
        {
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
            },
        }
    );
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
}

// 2. 創建協會專屬 Profile
async function createAssociationProfile(
    associationId: string, 
    data: CreateProfileRequest
): Promise<ProfileCreationResponse> {
    const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/association/associations/${associationId}/profiles`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        }
    );
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API error');
    }
    
    return response.json();
}

// 3. 完整流程示例
async function handlePaymentSuccess(sessionId: string) {
    try {
        // 查詢付款狀態
        const paymentResponse = await getPaymentStatus(sessionId);
        
        if (!paymentResponse.success || !paymentResponse.data.order.associationId) {
            throw new Error('非協會購買或付款未完成');
        }

        const { associationId } = paymentResponse.data.order;
        const associationName = paymentResponse.data.order.association.name;

        // 顯示 Profile 創建提示（可以用更美觀的 Modal）
        const shouldCreate = confirm(`是否要為 ${associationName} 創建專屬 Profile？`);
        
        if (shouldCreate) {
            // 創建協會專屬 Profile
            const profileResponse = await createAssociationProfile(associationId, {
                // 使用前端期望的 customization 格式
                customization: {
                    associationBadge: true,
                    associationTheme: true,
                    associationBranding: associationName,
                    profileType: "ASSOCIATION_MEMBER"
                },
                isPublic: true
            });

            if (profileResponse.success) {
                // 跳轉到 Profile 編輯頁面
                window.location.href = `/dashboard/profiles/${profileResponse.data.profile.id}/edit`;
            }
        }
    } catch (error) {
        console.error('處理付款成功流程失敗:', error);
        // 顯示用戶友好的錯誤信息
        alert('創建 Profile 時發生錯誤，請稍後再試或聯絡客服。');
    }
}
```

### React Hook 示例

```typescript
import { useState, useEffect } from 'react';

export function usePaymentSuccess(sessionId: string | null) {
    const [paymentData, setPaymentData] = useState<PaymentStatusResponse['data'] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!sessionId) return;

        async function fetchPaymentStatus() {
            setLoading(true);
            setError(null);
            
            try {
                const response = await getPaymentStatus(sessionId);
                if (response.success) {
                    setPaymentData(response.data);
                } else {
                    setError(response.error?.message || '查詢失敗');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : '網絡錯誤');
            } finally {
                setLoading(false);
            }
        }

        fetchPaymentStatus();
    }, [sessionId]);

    const createProfile = async (data: CreateProfileRequest) => {
        if (!paymentData?.order.associationId) {
            throw new Error('缺少協會信息');
        }

        setLoading(true);
        try {
            const response = await createAssociationProfile(
                paymentData.order.associationId,
                data
            );
            return response;
        } finally {
            setLoading(false);
        }
    };

    return {
        paymentData,
        loading,
        error,
        createProfile,
        isAssociationPurchase: !!paymentData?.order.associationId,
        associationName: paymentData?.order.association?.name,
    };
}
```

### React 組件示例

```tsx
import { useRouter } from 'next/navigation';
import { usePaymentSuccess } from './hooks/usePaymentSuccess';

interface PaymentSuccessPageProps {
    sessionId: string;
}

export function PaymentSuccessPage({ sessionId }: PaymentSuccessPageProps) {
    const router = useRouter();
    const { paymentData, loading, error, createProfile, isAssociationPurchase, associationName } = 
        usePaymentSuccess(sessionId);

    const handleCreateProfile = async () => {
        try {
            const response = await createProfile({
                customization: {
                    associationBadge: true,
                    associationTheme: true,
                    associationBranding: associationName,
                    profileType: "ASSOCIATION_MEMBER"
                },
                isPublic: true
            });

            if (response.success) {
                router.push(`/dashboard/profiles/${response.data.profile.id}/edit`);
            }
        } catch (error) {
            console.error('創建 Profile 失敗:', error);
        }
    };

    if (loading) return <div>載入中...</div>;
    if (error) return <div>錯誤: {error}</div>;
    if (!paymentData) return <div>未找到付款信息</div>;

    return (
        <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-green-600 mb-4">付款成功！</h1>
            
            <div className="mb-6">
                <p className="text-gray-600">訂單號: {paymentData.order.orderNumber}</p>
                <p className="text-gray-600">金額: ${paymentData.order.amount}</p>
            </div>

            {isAssociationPurchase && (
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <h2 className="text-lg font-semibold mb-2">創建協會專屬 Profile</h2>
                    <p className="text-gray-600 mb-4">
                        您現在是 <strong>{associationName}</strong> 的會員！
                        建議您創建一個協會專屬的 Profile 來展示您的會員身份。
                    </p>
                    
                    <div className="flex gap-3">
                        <button
                            onClick={handleCreateProfile}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? '創建中...' : '立即創建 Profile'}
                        </button>
                        
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                            稍後再說
                        </button>
                    </div>
                </div>
            )}

            <button
                onClick={() => router.push('/dashboard')}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
                前往控制台
            </button>
        </div>
    );
}
```

## 安全性與驗證

### 權限驗證
1. ✅ 所有API都需要有效的JWT認證
2. ✅ Profile創建會驗證用戶是協會成員
3. ✅ 付款狀態查詢會驗證訂單所有權

### 輸入驗證
1. ✅ 使用class-validator進行參數驗證
2. ✅ 防止SQL注入和XSS攻擊
3. ✅ 字符長度和格式限制

### 重複創建防護
1. ✅ 檢查用戶是否已有該協會的專屬Profile
2. ✅ 唯一索引防止數據重複

## 錯誤處理

### 常見錯誤碼
- `ORDER_NOT_FOUND`: 訂單不存在
- `NOT_MEMBER`: 用戶不是協會成員
- `ASSOCIATION_NOT_FOUND`: 協會不存在
- `USER_NOT_AUTHENTICATED`: 用戶未認證
- `UNAUTHORIZED_ACCESS`: 無權訪問
- `VALIDATION_ERROR`: 輸入驗證失敗

### 錯誤響應格式
```json
{
    "success": false,
    "error": {
        "message": "錯誤描述",
        "code": "ERROR_CODE",
        "details": "詳細信息（可選）"
    }
}
```

## 測試建議

### API 測試用例

```bash
# 1. 測試付款狀態查詢
curl -X GET "https://your-api.com/api/payment/purchase-orders/payment-status/cs_test_123" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. 測試協會Profile創建（基本版）
curl -X POST "https://your-api.com/api/association/associations/assoc_123/profiles" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"測試Profile","isPublic":true}'

# 3. 測試協會Profile創建（完整版）
curl -X POST "https://your-api.com/api/association/associations/assoc_123/profiles" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "協會專屬Profile",
    "description": "我的協會會員檔案",
    "isPublic": true,
    "customization": {
      "associationBadge": true,
      "associationTheme": true,
      "associationBranding": "台灣軟體工程師協會",
      "profileType": "ASSOCIATION_MEMBER"
    }
  }'
```

### 前端測試場景
1. ✅ 付款成功後的協會Profile創建流程
2. ✅ 非協會購買的處理
3. ✅ 重複創建的防護
4. ✅ 網絡錯誤的處理
5. ✅ 未認證用戶的處理
6. ✅ customization配置的正確傳遞

## 監控與日誌

系統會記錄以下操作日誌：
1. Profile創建成功/失敗
2. 協會會員權限驗證
3. 重複創建嘗試
4. 付款狀態查詢
5. 徽章添加操作

## 部署注意事項

### 環境變量
確保前端配置正確的API地址：
```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### CORS 設置
後端已配置CORS支持前端域名請求。

## 與前端原始需求的匹配度

| 前端需求 | 實現狀況 | 說明 |
|---------|---------|------|
| `POST /api/association/associations/{id}/profiles` | ✅ 完全匹配 | API路徑完全相同 |
| 支持 customization 字段 | ✅ 已實現 | 包含 associationBadge, associationTheme 等 |
| 自動添加協會徽章 | ✅ 已實現 | 根據 customization.associationBadge 控制 |
| 付款狀態包含 associationId | ✅ 已實現 | 響應中包含獨立的 associationId 字段 |
| 應用協會主題品牌 | ✅ 已實現 | 通過 customization 配置 |
| 生成唯一 slug | ✅ 已實現 | 自動生成協會專屬 slug |
| 會員權限驗證 | ✅ 已實現 | 創建前驗證用戶是協會成員 |
| 重複創建防護 | ✅ 已實現 | 防止同一用戶重複創建協會Profile |

## 聯絡方式

如有技術問題，請聯絡：
- 後端團隊：backend@linkcard.com
- API文檔更新：docs@linkcard.com

---

**最後更新：** 2024-01-15  
**版本：** v1.1  
**狀態：** ✅ 已實現並測試完成，完全匹配前端需求 