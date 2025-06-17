# 🚀 Stripe 支付系統完整實施路線圖

## 📋 概覽

基於業界標準的 Stripe 支付系統完整實施計劃，確保用戶購買會員後能正確獲得相應的商品和服務。

## 🔥 當前問題分析

### 緊急問題
- ❌ 前端無法通過 `session_id` 查詢支付狀態
- ❌ 前端缺少支付成功後的確認流程
- ❌ 用戶支付成功但無法確認會員狀態

### 業務影響
- 💸 支付成功但用戶體驗不完整
- 🤔 用戶不確定會員是否已激活
- 📞 可能增加客服工作量

## 🎯 實施策略

### 核心原則
1. **安全第一** - 確保支付和會員數據安全
2. **用戶體驗** - 流暢的支付到會員激活流程
3. **可靠性** - 處理各種邊界情況和錯誤
4. **可監控** - 完整的日誌和監控機制

### 開發方法
- 🚀 **MVP 優先** - 先解決核心問題
- 📈 **增量開發** - 分階段實施和部署
- 🧪 **測試驅動** - 每個功能都有對應測試
- 📊 **數據驅動** - 基於監控數據優化

## 📅 詳細實施計劃

### Phase 1: 緊急補救措施 (1-2天) 🚨

#### 🎯 目標
修復當前支付流程中的關鍵問題，確保基本功能正常運行。

#### 🔧 後端任務 (優先級: P0)

**1.1 添加通過 session_id 查詢訂單的方法**
```typescript
// src/payment/services/PurchaseOrderService.ts
async getOrderBySessionId(sessionId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
        where: {
            stripeData: {
                path: ['sessionId'],
                equals: sessionId,
            },
        },
        include: {
            pricingPlan: true,
            user: {
                select: {
                    id: true,
                    email: true,
                    username: true,
                    display_name: true,
                },
            },
            association: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
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

**1.2 添加新的 API 端點**
```typescript
// src/payment/controllers/PaymentHelperController.ts
checkPaymentStatusBySession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const order = await this.purchaseOrderService.getOrderBySessionId(sessionId);

        // 檢查會員狀態
        const member = await this.prisma.associationMember.findUnique({
            where: {
                associationId_userId: {
                    associationId: order.associationId,
                    userId: order.userId,
                },
            },
        });

        return ApiResponse.success(res, {
            orderId: order.id,
            sessionId: sessionId,
            paymentStatus: order.status,
            membershipStatus: member?.membershipStatus || 'PENDING',
            membershipTier: member?.membershipTier,
            membershipStartDate: order.membershipStartDate,
            membershipEndDate: order.membershipEndDate,
            amount: order.amount,
            currency: order.currency,
            paidAt: order.paidAt,
            association: {
                id: order.association.id,
                name: order.association.name,
                slug: order.association.slug,
            },
            pricingPlan: {
                name: order.pricingPlan.displayName,
                tier: order.pricingPlan.membershipTier,
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

**1.3 更新路由配置**
```typescript
// src/payment/routes/payment.routes.ts
router.get('/status/session/:sessionId', authMiddleware, paymentHelperController.checkPaymentStatusBySession);
```

#### 🖥️ 前端任務 (優先級: P0)

**1.4 修復認證問題**
```typescript
// 確保正確的 API 端點和認證格式
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3020';

const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = getCookie('authToken');
  
  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};
```

**1.5 創建基本的支付確認頁面**
```typescript
// pages/payment/success.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentData, setPaymentData] = useState<any>(null);

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
      const response = await authenticatedFetch(`/api/payment/status/session/${sessionId}`);
      
      if (!response.ok) {
        throw new Error('API 請求失敗');
      }

      const { data } = await response.json();
      setPaymentData(data);
      
      if (data.paymentStatus === 'PAID') {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('檢查支付狀態失敗:', error);
      setStatus('error');
    }
  };

  // UI 渲染邏輯...
}
```

#### ✅ Phase 1 驗收標準
- [ ] 前端可以通過 `session_id` 查詢支付狀態
- [ ] 支付成功頁面正確顯示會員信息
- [ ] API 返回完整的訂單和會員數據
- [ ] 認證問題已解決

---

### Phase 2: 完整用戶體驗實施 (3-5天) 🎨

#### 🎯 目標
實現完整的支付確認流程，包括輪詢、錯誤處理和優秀的用戶體驗。

#### 🖥️ 前端任務

**2.1 完整的支付狀態處理**
```typescript
// components/PaymentStatusChecker.tsx
import { useEffect, useState, useCallback } from 'react';

interface PaymentStatusCheckerProps {
  sessionId: string;
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
}

export const PaymentStatusChecker: React.FC<PaymentStatusCheckerProps> = ({
  sessionId,
  onSuccess,
  onError,
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 30; // 30次重試 = 約1分鐘

  const checkStatus = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`/api/payment/status/session/${sessionId}`);
      const { data } = await response.json();

      if (data.paymentStatus === 'PAID' && data.membershipStatus === 'ACTIVE') {
        onSuccess(data);
      } else if (data.paymentStatus === 'FAILED') {
        onError('支付失敗');
      } else if (retryCount < maxRetries) {
        // 繼續輪詢
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          checkStatus();
        }, 2000);
      } else {
        onError('處理超時，請聯繫客服');
      }
    } catch (error) {
      onError('檢查狀態失敗');
    }
  }, [sessionId, retryCount, maxRetries, onSuccess, onError]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return (
    <div className="payment-status-checker">
      <div className="loading-spinner" />
      <p>正在確認支付狀態... ({retryCount}/{maxRetries})</p>
    </div>
  );
};
```

**2.2 完整的 Success 頁面**
```typescript
// pages/payment/success.tsx - 完整版本
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaymentStatusChecker } from '@/components/PaymentStatusChecker';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return (
      <div className="payment-error">
        <h2>❌ 無效的支付鏈接</h2>
        <p>請重新進行支付</p>
      </div>
    );
  }

  const handleSuccess = (data: any) => {
    setPaymentData(data);
    setStatus('success');
  };

  const handleError = (error: string) => {
    setErrorMessage(error);
    setStatus('error');
  };

  if (status === 'checking') {
    return (
      <div className="payment-checking">
        <h2>🎉 支付成功！</h2>
        <p>正在激活您的會員資格...</p>
        <PaymentStatusChecker 
          sessionId={sessionId}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="payment-error">
        <h2>❌ 處理失敗</h2>
        <p>{errorMessage}</p>
        <button onClick={() => window.location.href = '/support'}>
          聯繫客服
        </button>
      </div>
    );
  }

  // status === 'success'
  return (
    <div className="payment-success">
      <h1>🎉 歡迎加入！</h1>
      <div className="membership-info">
        <h3>會員資格已激活</h3>
        <div className="details">
          <p><strong>協會:</strong> {paymentData.association.name}</p>
          <p><strong>會員等級:</strong> {paymentData.pricingPlan.tier}</p>
          <p><strong>有效期至:</strong> {new Date(paymentData.membershipEndDate).toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="next-actions">
        <button 
          className="primary-button"
          onClick={() => window.location.href = '/dashboard'}
        >
          開始探索會員權益
        </button>
        <button 
          className="secondary-button"
          onClick={() => window.location.href = '/profile'}
        >
          查看我的會員資格
        </button>
      </div>
    </div>
  );
}
```

#### 🔧 後端增強

**2.3 會員權益檢查 API**
```typescript
// src/association/controllers/MemberController.ts
getMemberBenefits = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { associationId } = req.params;

        const member = await this.memberService.getMemberWithBenefits(userId, associationId);
        
        return ApiResponse.success(res, {
            member,
            benefits: {
                hasAccess: member.membershipStatus === 'ACTIVE',
                tier: member.membershipTier,
                expiryDate: member.renewalDate,
                accessibleContent: await this.getAccessibleContent(member.membershipTier),
                specialFeatures: await this.getSpecialFeatures(member.membershipTier),
            },
        });
    } catch (error: unknown) {
        const apiError = error as ApiError;
        return ApiResponse.error(res, '獲取會員權益失敗', 'MEMBER_BENEFITS_ERROR', apiError.message, apiError.status || 500);
    }
};
```

#### ✅ Phase 2 驗收標準
- [ ] 支付確認頁面有完整的用戶體驗
- [ ] 輪詢機制正常工作
- [ ] 錯誤情況得到妥善處理
- [ ] 會員權益正確顯示

---

### Phase 3: 會員權益系統完善 (3-4天) 🏆

#### 🎯 目標
確保用戶購買會員後能獲得相應的商品和服務。

#### 🔧 會員權益實現

**3.1 權限控制中間件**
```typescript
// src/middleware/membershipMiddleware.ts
export const requireMembership = (requiredTier: MembershipTier) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id;
            const { associationId } = req.params;

            const member = await prisma.associationMember.findUnique({
                where: {
                    associationId_userId: {
                        associationId,
                        userId,
                    },
                },
            });

            if (!member || member.membershipStatus !== 'ACTIVE') {
                return ApiResponse.unauthorized(res, '需要有效的會員資格', 'MEMBERSHIP_REQUIRED');
            }

            const tierLevel = getTierLevel(member.membershipTier);
            const requiredLevel = getTierLevel(requiredTier);

            if (tierLevel < requiredLevel) {
                return ApiResponse.forbidden(res, '會員等級不足', 'INSUFFICIENT_MEMBERSHIP_TIER');
            }

            req.member = member;
            next();
        } catch (error) {
            return ApiResponse.error(res, '會員驗證失敗', 'MEMBERSHIP_VERIFICATION_ERROR');
        }
    };
};
```

**3.2 會員專屬內容 API**
```typescript
// src/association/controllers/MemberContentController.ts
getMemberContent = async (req: Request, res: Response) => {
    try {
        const { associationId } = req.params;
        const member = req.member; // 由 middleware 注入

        const content = await this.contentService.getMemberContent(
            associationId,
            member.membershipTier
        );

        return ApiResponse.success(res, {
            content,
            memberInfo: {
                tier: member.membershipTier,
                status: member.membershipStatus,
                expiryDate: member.renewalDate,
            },
        });
    } catch (error: unknown) {
        const apiError = error as ApiError;
        return ApiResponse.error(res, '獲取會員內容失敗', 'MEMBER_CONTENT_ERROR', apiError.message);
    }
};
```

**3.3 前端會員狀態顯示**
```typescript
// components/MembershipBadge.tsx
export const MembershipBadge: React.FC<{ userId: string; associationId: string }> = ({
  userId,
  associationId,
}) => {
  const [membershipData, setMembershipData] = useState<any>(null);

  useEffect(() => {
    fetchMembershipStatus();
  }, []);

  const fetchMembershipStatus = async () => {
    try {
      const response = await authenticatedFetch(
        `/api/association/${associationId}/members/me/benefits`
      );
      const { data } = await response.json();
      setMembershipData(data);
    } catch (error) {
      console.error('獲取會員狀態失敗:', error);
    }
  };

  if (!membershipData?.benefits?.hasAccess) {
    return null;
  }

  return (
    <div className={`membership-badge tier-${membershipData.member.membershipTier.toLowerCase()}`}>
      <span className="badge-icon">👑</span>
      <span className="badge-text">
        {membershipData.member.membershipTier} 會員
      </span>
    </div>
  );
};
```

#### ✅ Phase 3 驗收標準
- [ ] 會員權限控制正常工作
- [ ] 不同等級會員看到相應內容
- [ ] 會員狀態正確顯示在 UI 中
- [ ] 會員專屬功能可以訪問

---

### Phase 4: 監控和優化 (2-3天) 📊

#### 🎯 目標
建立完整的監控體系，確保系統穩定運行。

#### 📈 監控和日誌

**4.1 支付監控**
```typescript
// src/payment/services/PaymentMonitoringService.ts
@Service()
export class PaymentMonitoringService {
    async logPaymentEvent(event: string, data: any) {
        await this.prisma.paymentLog.create({
            data: {
                event,
                data: JSON.stringify(data),
                timestamp: new Date(),
            },
        });
    }

    async getPaymentStats(dateRange: { start: Date; end: Date }) {
        const stats = await this.prisma.purchaseOrder.groupBy({
            by: ['status'],
            where: {
                createdAt: {
                    gte: dateRange.start,
                    lte: dateRange.end,
                },
            },
            _count: true,
            _sum: {
                amount: true,
            },
        });

        return {
            totalOrders: stats.reduce((sum, stat) => sum + stat._count, 0),
            totalRevenue: stats.reduce((sum, stat) => sum + (stat._sum.amount || 0), 0),
            successRate: this.calculateSuccessRate(stats),
            statusBreakdown: stats,
        };
    }
}
```

**4.2 錯誤處理和告警**
```typescript
// src/utils/errorHandler.ts
export class PaymentErrorHandler {
    static async handlePaymentError(error: any, context: string) {
        // 記錄錯誤
        console.error(`Payment Error in ${context}:`, error);
        
        // 發送告警（如果是嚴重錯誤）
        if (this.isCriticalError(error)) {
            await this.sendAlert(error, context);
        }
        
        // 記錄到數據庫
        await this.logError(error, context);
    }

    private static isCriticalError(error: any): boolean {
        return error.code === 'WEBHOOK_SIGNATURE_VERIFICATION_FAILED' ||
               error.code === 'PAYMENT_PROCESSING_FAILED';
    }
}
```

#### ✅ Phase 4 驗收標準
- [ ] 支付成功率監控正常
- [ ] 錯誤日誌和告警機制運行
- [ ] 性能指標在合理範圍內
- [ ] 用戶反饋收集機制建立

---

## 🧪 測試計劃

### 單元測試
```typescript
// tests/payment/PurchaseOrderService.test.ts
describe('PurchaseOrderService', () => {
  describe('getOrderBySessionId', () => {
    it('should return order for valid session_id', async () => {
      // 測試邏輯
    });

    it('should throw error for invalid session_id', async () => {
      // 測試邏輯
    });
  });
});
```

### 集成測試
```typescript
// tests/integration/paymentFlow.test.ts
describe('Payment Flow Integration', () => {
  it('should complete full payment to membership activation flow', async () => {
    // 1. 創建訂單
    // 2. 模擬 Stripe webhook
    // 3. 驗證會員狀態
    // 4. 檢查權限
  });
});
```

### E2E 測試
- 完整的用戶支付流程
- 不同會員等級的權限測試
- 錯誤場景處理測試

## 📋 實施檢查清單

### Phase 1 (緊急) ✅
- [ ] 後端添加 `getOrderBySessionId` 方法
- [ ] 新增 API 端點 `/api/payment/status/session/{sessionId}`
- [ ] 前端修復認證問題
- [ ] 基本支付確認頁面
- [ ] 測試端到端支付流程

### Phase 2 (完整體驗) ✅
- [ ] 支付狀態輪詢機制
- [ ] 完整的 Success 頁面 UI
- [ ] 錯誤處理和用戶反饋
- [ ] 會員權益信息顯示

### Phase 3 (業務邏輯) ✅
- [ ] 會員權限控制中間件
- [ ] 會員專屬內容 API
- [ ] 前端會員狀態顯示
- [ ] 不同等級權益實現

### Phase 4 (監控優化) ✅
- [ ] 支付監控和統計
- [ ] 錯誤日誌和告警
- [ ] 性能監控
- [ ] 用戶反饋收集

## 🚀 開始實施

### 立即開始 (今天)
1. **後端工程師**: 實施 Phase 1 的 API 改進
2. **前端工程師**: 修復認證問題和創建基本確認頁面
3. **測試**: 準備測試環境和測試數據

### 本週完成
- Phase 1 和 Phase 2 完成
- 基本的支付確認流程可以正常運行
- 用戶體驗得到明顯改善

### 下週完成
- Phase 3 和 Phase 4 完成
- 完整的會員權益系統
- 監控和優化機制

這個計劃遵循業界標準，確保我哋能夠：
- ✅ **快速解決當前問題**
- ✅ **提供完整的用戶體驗**  
- ✅ **建立可靠的系統架構**
- ✅ **支持未來的功能擴展** 