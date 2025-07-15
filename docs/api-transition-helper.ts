/**
 * API過渡助手 - 幫助前端從Lead API遷移到PurchaseIntent API
 *
 * 使用方式：
 * 1. 將此文件復制到你的前端項目中
 * 2. 導入相關函數替換原有的API調用
 * 3. 根據需要調整URL前綴和錯誤處理
 */

// 配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3020/api';

// 類型定義
interface PurchaseContext {
    associationId: string;
    pricingPlanId: string;
    planName?: string;
    amount?: number;
    currency?: string;
}

interface LeadData {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    organization?: string;
    message?: string;
    source?: string;
    purchaseContext?: PurchaseContext;
}

interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}

// 🆕 新的購買意向API函數
export async function createPurchaseIntent(
    associationId: string,
    purchaseIntentData: LeadData,
    authToken?: string,
): Promise<ApiResponse> {
    const response = await fetch(
        `${API_BASE_URL}/association/associations/${associationId}/purchase-intents`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { Authorization: `Bearer ${authToken}` }),
            },
            body: JSON.stringify(purchaseIntentData),
        },
    );

    if (!response.ok) {
        throw new Error(`Purchase intent creation failed: ${response.statusText}`);
    }

    return response.json();
}

// 🆕 獲取用戶購買意向記錄
export async function getUserPurchaseIntents(
    associationId: string,
    authToken: string,
): Promise<ApiResponse> {
    const response = await fetch(
        `${API_BASE_URL}/association/associations/${associationId}/purchase-intents/user`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        },
    );

    if (!response.ok) {
        throw new Error(`Failed to get purchase intents: ${response.statusText}`);
    }

    return response.json();
}

// 🆕 根據郵箱查找購買意向
export async function findPurchaseIntentByEmail(
    associationId: string,
    email: string,
): Promise<ApiResponse> {
    const response = await fetch(
        `${API_BASE_URL}/association/associations/${associationId}/purchase-intents/find-by-email?email=${encodeURIComponent(email)}`,
        {
            method: 'GET',
        },
    );

    if (!response.ok) {
        throw new Error(`Failed to find purchase intent: ${response.statusText}`);
    }

    return response.json();
}

// 🔄 智能路由函數 - 自動判斷使用新舊API
export async function createAssociationLeadSmart(
    associationId: string,
    leadData: LeadData,
    authToken?: string,
): Promise<ApiResponse> {
    // 如果包含購買上下文，使用新的購買意向API
    if (leadData.purchaseContext) {
        console.log('🚀 使用新的購買意向API');
        return createPurchaseIntent(associationId, leadData, authToken);
    }

    // 否則使用舊的Lead API (CRM用途)
    console.log('📊 使用傳統Lead API (CRM)');
    return createTraditionalLead(associationId, leadData, authToken);
}

// 📊 傳統Lead API (僅用於CRM)
export async function createTraditionalLead(
    associationId: string,
    leadData: LeadData,
    authToken?: string,
): Promise<ApiResponse> {
    const response = await fetch(
        `${API_BASE_URL}/association/associations/${associationId}/leads`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { Authorization: `Bearer ${authToken}` }),
            },
            body: JSON.stringify(leadData),
        }
    );

    if (!response.ok) {
        throw new Error(`Lead creation failed: ${response.statusText}`);
    }

    return response.json();
}

// ✅ Profile預填API (無需修改，但提供包裝)
export async function getProfilePrefillOptions(
    associationId: string,
    userId: string,
    orderId: string,
    authToken: string,
): Promise<ApiResponse> {
    const response = await fetch(
        `${API_BASE_URL}/association/associations/${associationId}/profile-prefill/${userId}?orderId=${orderId}`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to get profile prefill options: ${response.statusText}`);
    }

    return response.json();
}

// 🛠️ 使用示例
export const examples = {
    // 創建購買意向數據
    async createPurchaseExample() {
        const result = await createPurchaseIntent('association-id', {
            firstName: 'Edison',
            lastName: 'UN',
            email: 'edison@example.com',
            phone: '+853-1234-5678',
            organization: 'Travel J',
            message: '購買意向: 高級會員',
            purchaseContext: {
                associationId: 'association-id',
                pricingPlanId: 'plan-id',
                planName: '高級會員',
                amount: 1000,
                currency: 'HKD'
            }
        });
        
        console.log('購買意向創建結果:', result);
        return result;
    },

    // 智能路由示例
    async smartRoutingExample() {
        // 這會自動使用購買意向API
        const purchaseResult = await createAssociationLeadSmart('association-id', {
            firstName: 'Customer',
            lastName: 'One',
            email: 'customer@example.com',
            purchaseContext: {
                associationId: 'association-id',
                pricingPlanId: 'plan-id'
            }
        });

        // 這會使用傳統Lead API (CRM)
        const leadResult = await createAssociationLeadSmart('association-id', {
            firstName: 'Lead',
            lastName: 'Person',
            email: 'lead@example.com',
            message: '詢問協會服務'
            // 沒有purchaseContext，所以使用CRM Lead API
        });

        return { purchaseResult, leadResult };
    },

    // 獲取Profile預填選項
    async getProfilePrefillExample() {
        const result = await getProfilePrefillOptions(
            'association-id',
            'user-id',
            'order-id',
            'auth-token'
        );
        
        console.log('Profile預填選項:', result);
        return result;
    }
};

// 🔧 遷移工具函數
export const migrationHelpers = {
    // 檢查是否為購買流程數據
    isPurchaseIntentData(leadData: LeadData): boolean {
        return !!(leadData.purchaseContext && leadData.purchaseContext.pricingPlanId);
    },

    // 轉換舊格式到新格式
    convertLegacyToPurchaseIntent(legacyData: any): LeadData {
        return {
            firstName: legacyData.firstName,
            lastName: legacyData.lastName,
            email: legacyData.email,
            phone: legacyData.phone,
            organization: legacyData.organization,
            message: legacyData.message,
            purchaseContext: {
                associationId: legacyData.associationId,
                pricingPlanId: legacyData.pricingPlanId,
                planName: legacyData.planName,
                amount: legacyData.amount,
                currency: legacyData.currency || 'HKD'
            }
        };
    },

    // 批量測試API連通性
    async testApiConnectivity(associationId: string, authToken: string) {
        const tests = {
            purchaseIntentCreate: false,
            purchaseIntentGet: false,
            profilePrefill: false,
            traditionalLead: false
        };

        try {
            // 測試創建購買意向 (使用測試數據)
            await createPurchaseIntent(associationId, {
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com',
                purchaseContext: {
                    associationId,
                    pricingPlanId: 'test-plan-id'
                }
            });
            tests.purchaseIntentCreate = true;
        } catch (error) {
            console.error('購買意向創建測試失敗:', error);
        }

        try {
            // 測試獲取購買意向
            await getUserPurchaseIntents(associationId, authToken);
            tests.purchaseIntentGet = true;
        } catch (error) {
            console.error('獲取購買意向測試失敗:', error);
        }

        try {
            // 測試傳統Lead創建
            await createTraditionalLead(associationId, {
                firstName: 'Test',
                lastName: 'Lead',
                email: 'testlead@example.com',
                message: 'CRM測試'
            });
            tests.traditionalLead = true;
        } catch (error) {
            console.error('傳統Lead創建測試失敗:', error);
        }

        console.log('API連通性測試結果:', tests);
        return tests;
    }
};

// 導出所有功能
export default {
    createPurchaseIntent,
    getUserPurchaseIntents,
    findPurchaseIntentByEmail,
    createAssociationLeadSmart,
    createTraditionalLead,
    getProfilePrefillOptions,
    examples,
    migrationHelpers
}; 