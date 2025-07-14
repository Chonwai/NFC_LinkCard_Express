# Lead收集系統前端API集成指南

## 📋 概述

本文檔為前端工程師提供Lead收集系統的完整API集成指南。該系統提供多種Lead收集方式，支援訪客資訊收集、用戶註冊與Lead同步創建、以及完整的Lead管理功能。

## 🎯 核心功能

### Lead收集方式
1. **基本Lead收集** - 訪客在協會頁面提交聯繫表單
2. **Profile Lead收集** - 訪客在個人Profile頁面留言
3. **一站式註冊+Lead** - 有購買意向的用戶註冊時同步創建Lead
4. **Lead管理** - 協會管理員管理和追蹤Lead狀態
5. **Profile預填** - 購買後基於Lead數據智能預填Profile

## 📊 數據模型

### Lead狀態枚舉
```typescript
enum LeadStatus {
  NEW = 'NEW',                  // 新Lead
  CONTACTED = 'CONTACTED',      // 已聯繫
  QUALIFIED = 'QUALIFIED',      // 已驗證
  CONVERTED = 'CONVERTED',      // 已轉換（購買成功）
  REJECTED = 'REJECTED'         // 已拒絕
}
```

### Lead來源枚舉
```typescript
enum LeadSource {
  WEBSITE_CONTACT = 'WEBSITE_CONTACT',      // 網站聯繫表單
  PURCHASE_INTENT = 'PURCHASE_INTENT',      // 購買意向表單
  EVENT_REGISTRATION = 'EVENT_REGISTRATION', // 活動註冊
  REFERRAL = 'REFERRAL',                    // 推薦
  OTHER = 'OTHER'                           // 其他
}
```

### Lead優先級枚舉
```typescript
enum LeadPriority {
  LOW = 'LOW',        // 低優先級
  MEDIUM = 'MEDIUM',  // 中優先級
  HIGH = 'HIGH',      // 高優先級
  URGENT = 'URGENT'   // 緊急
}
```

## 🌐 公開Lead收集API

### 1. 基本Lead收集表單

**端點**: `POST /api/association/associations/{associationId}/leads`

**用途**: 訪客在協會頁面提交聯繫表單

**請求體**:
```typescript
{
  firstName: string;      // 名字
  lastName: string;       // 姓氏
  email: string;          // 郵箱
  phone?: string;         // 電話（可選）
  organization?: string;  // 組織/公司（可選）
  message?: string;       // 留言（可選）
}
```

**響應**:
```typescript
{
  success: true,
  data: {
    message: "您的申請已成功提交，協會將儘快與您聯繫",
    lead: {
      id: string;
      createdAt: string;
    }
  }
}
```

**前端實現建議**:
```typescript
// 協會頁面的聯繫表單
const submitContactForm = async (formData) => {
  try {
    const response = await fetch(`/api/association/associations/${associationId}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        organization: formData.company,
        message: formData.message
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 顯示成功消息
      showSuccessMessage(result.data.message);
      // 清空表單
      resetForm();
    }
  } catch (error) {
    console.error('提交失敗:', error);
    showErrorMessage('提交失敗，請稍後重試');
  }
};
```

### 2. 一站式註冊+Lead創建

**端點**: `POST /api/auth/register-with-lead`

**用途**: 有購買意向的用戶註冊時同步創建Lead記錄

**請求體**:
```typescript
{
  // 用戶註冊資訊
  user: {
  username: string;
    email: string;
  password: string;
  display_name?: string;
  };
  
  // Lead資訊
  lead: {
    firstName: string;
    lastName: string;
    phone?: string;
    organization?: string;
    message?: string;
  };
    
  // 購買上下文
  purchaseContext: {
    associationId: string;
    pricingPlanId: string;
    planName?: string;
    amount?: number;
    currency?: string;
  };
}
```

**響應**:
```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      username: string;
      email: string;
      isVerified: boolean;
      displayName?: string;
    },
    lead: {
      id: string;
      source: string;
      status: string;
      priority: string;
    },
    token: string;
    nextStep: {
      action: 'PROCEED_TO_PAYMENT';
      checkoutUrl?: string;
      orderId?: string;
    };
  }
}
```

**前端實現建議**:
```typescript
// 購買流程中的註冊表單
const handlePurchaseRegistration = async (formData) => {
  try {
    const response = await fetch('/api/auth/register-with-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: {
        username: formData.username,
          email: formData.email,
        password: formData.password,
          display_name: formData.displayName
        },
        lead: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          organization: formData.company,
          message: formData.requirements
        },
          purchaseContext: {
          associationId: currentAssociation.id,
          pricingPlanId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          currency: 'TWD'
        }
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 保存認證token
      localStorage.setItem('authToken', result.data.token);
      
      // 根據下一步指引跳轉
      if (result.data.nextStep.action === 'PROCEED_TO_PAYMENT') {
        if (result.data.nextStep.checkoutUrl) {
          window.location.href = result.data.nextStep.checkoutUrl;
        } else {
          router.push(`/purchase/${currentAssociation.id}`);
        }
      }
    }
  } catch (error) {
    console.error('註冊失敗:', error);
  }
};
```

## 🔐 認證Lead管理API

### 3. Lead列表查詢

**端點**: `GET /api/association/associations/{associationId}/leads`

**用途**: 獲取協會的Lead列表（基本版本）

**認證**: 需要Bearer Token

**響應**:
```typescript
{
  success: true,
  data: {
    leads: [
      {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        organization?: string;
        message?: string;
        status: LeadStatus;
        source: LeadSource;
        priority: LeadPriority;
        createdAt: string;
        updatedAt: string;
      }
    ]
  }
}
```

### 4. Lead過濾查詢（進階版）

**端點**: `GET /api/association/associations/{associationId}/leads/filter`

**用途**: 提供過濾、搜索、分頁的Lead查詢功能

**認證**: 需要Bearer Token

**查詢參數**:
```typescript
{
  page?: number;           // 頁碼，默認1
  limit?: number;          // 每頁數量，默認10
  source?: LeadSource;     // 按來源過濾
  status?: LeadStatus;     // 按狀態過濾
  priority?: LeadPriority; // 按優先級過濾
  sortBy?: string;         // 排序字段
  sortOrder?: 'asc' | 'desc'; // 排序方向
  search?: string;         // 搜索關鍵字
  dateFrom?: string;       // 開始日期 (YYYY-MM-DD)
  dateTo?: string;         // 結束日期 (YYYY-MM-DD)
}
```

**響應**:
```typescript
{
  success: true,
  data: {
    leads: [
      {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        organization?: string;
        message?: string;
        status: LeadStatus;
        source: LeadSource;
        priority: LeadPriority;
        metadata?: Record<string, any>;
        createdAt: string;
        updatedAt: string;
        
        // 關聯數據
        purchaseOrder?: {
          id: string;
          status: string;
          totalAmount: number;
          currency: string;
        };
        user?: {
          id: string;
          username: string;
          display_name: string;
        };
      }
    ],
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    }
  }
}
```

**前端實現建議**:
```typescript
// Lead管理頁面
const useLeads = (associationId, filters) => {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(
        Object.entries(filters).filter(([_, v]) => v)
      );
      
      const response = await fetch(
        `/api/association/associations/${associationId}/leads/filter?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      const result = await response.json();
      if (result.success) {
        setLeads(result.data.leads);
        setPagination(result.data.pagination);
      }
    } catch (error) {
      console.error('獲取Lead數據失敗:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchLeads();
  }, [filters]);
  
  return { leads, pagination, loading, refetch: fetchLeads };
};
```

### 5. Lead統計分析

**端點**: `GET /api/association/associations/{associationId}/leads/stats`

**用途**: 獲取Lead轉換率和統計分析數據

**認證**: 需要Bearer Token

**查詢參數**:
```typescript
{
  dateFrom?: string;  // 統計開始日期
  dateTo?: string;    // 統計結束日期
}
```

**響應**:
```typescript
{
  success: true,
  data: {
    overview: {
      totalLeads: number;           // 總Lead數
      convertedLeads: number;       // 已轉換Lead數
      conversionRate: number;       // 轉換率 (0-100)
      totalRevenue: number;         // 總收入
      averageLeadValue: number;     // 平均Lead價值
    },
    
    byStatus: {
      NEW: number;
      CONTACTED: number;
      QUALIFIED: number;
      CONVERTED: number;
      REJECTED: number;
    },
    
    bySource: {
      WEBSITE_CONTACT: number;
      PURCHASE_INTENT: number;
      EVENT_REGISTRATION: number;
      REFERRAL: number;
      OTHER: number;
    },
    
    byPriority: {
      LOW: number;
      MEDIUM: number;
      HIGH: number;
      URGENT: number;
    },
    
    conversionBySource: {
      [source: string]: {
        total: number;
        converted: number;
        conversionRate: number;
      };
    }
  }
}
```

### 6. 單個Lead操作

#### 獲取單個Lead
**端點**: `GET /api/association/associations/{associationId}/leads/{leadId}`

#### 更新Lead
**端點**: `PUT /api/association/associations/{associationId}/leads/{leadId}`

**請求體**:
```typescript
{
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  organization?: string;
  message?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
}
```

#### 刪除Lead
**端點**: `DELETE /api/association/associations/{associationId}/leads/{leadId}`

## 🎨 Profile預填API

### 7. 獲取Profile預填數據

**端點**: `GET /api/association/associations/{associationId}/profile-prefill/{userId}`

**用途**: 購買成功後基於Lead數據提供Profile創建建議

**認證**: 需要Bearer Token

**查詢參數**:
```typescript
{
  orderId: string;  // 必需：購買訂單ID
}
```

**響應**:
```typescript
{
  success: true,
  data: {
    suggestedProfile: {
      name: string;              // 建議的Profile名稱
      description: string;       // 建議的Profile描述
      slug: string;             // 建議的URL slug
      appearance: {             // 建議的外觀設置
        theme: string;
        primaryColor: string;
      }
    },
    
    leadData: {
      firstName: string;
      lastName: string;
      organization?: string;
    },
    
    membershipInfo: {
      planName: string;
      tier: string;
      benefits: string[];
    },
    
    suggestedLinks: [          // 建議的連結
      {
        title: string;
        url: string;
        platform?: string;
        type: 'SOCIAL' | 'CUSTOM';
      }
    ]
  }
}
```

### 8. 基於Lead數據創建Profile

**端點**: `POST /api/association/associations/{associationId}/profiles/with-lead-data`

**用途**: 創建Profile時自動關聯Lead數據和協會徽章

**認證**: 需要Bearer Token

**請求體**:
```typescript
{
  userId: string;
  name: string;
  description?: string;
  slug?: string;
  appearance?: Record<string, any>;
  meta?: Record<string, any>;
  
  // 可選：指定要關聯的Lead ID
  leadId?: string;
}
```

**響應**:
```typescript
{
  success: true,
  data: {
    profile: {
      id: string;
      name: string;
      slug: string;
      description: string;
      // ... 其他Profile資訊
    },
    
    badge: {
      id: string;
      displayMode: string;
      // ... 協會徽章資訊
    },
    
    associatedLead?: {
      id: string;
      status: string;
      // ... Lead資訊
    }
  }
}
```

## 🚨 錯誤處理

### 常見錯誤代碼

#### 註冊相關錯誤
```typescript
// 郵箱已存在
{
  success: false,
  error: {
    message: "郵箱已被使用",
    code: "EMAIL_ALREADY_EXISTS"
  }
}

// 用戶名已存在
{
  success: false,
  error: {
    message: "用戶名已被使用",
    code: "USERNAME_ALREADY_EXISTS"
  }
}

// 協會不存在
{
  success: false,
  error: {
    message: "協會不存在",
    code: "ASSOCIATION_NOT_FOUND"
  }
}
```

#### 權限錯誤
```typescript
// 無權訪問
{
  success: false,
  error: {
    message: "無權訪問該協會的Lead數據",
    code: "PERMISSION_DENIED"
  }
}

// 未認證
{
  success: false,
  error: {
    message: "用戶未認證",
    code: "UNAUTHORIZED"
  }
}
```

#### Profile預填錯誤
```typescript
// 找不到Lead數據
{
  success: false,
  error: {
    message: "該用戶沒有關聯的Lead數據",
    code: "NO_LEAD_DATA_FOUND"
  }
}

// 缺少訂單ID
{
  success: false,
  error: {
    message: "缺少必需的訂單ID參數",
    code: "MISSING_ORDER_ID"
  }
}
```

### 前端錯誤處理建議

```typescript
// 通用錯誤處理函數
const handleApiError = (error, defaultMessage = '操作失敗') => {
  if (error.response?.data?.error) {
    const { message, code } = error.response.data.error;
    
    switch (code) {
      case 'EMAIL_ALREADY_EXISTS':
        return '此郵箱已被註冊，請使用其他郵箱或直接登入';
      case 'USERNAME_ALREADY_EXISTS':
        return '此用戶名已被使用，請選擇其他用戶名';
      case 'ASSOCIATION_NOT_FOUND':
        return '協會不存在，請檢查協會ID是否正確';
      case 'PERMISSION_DENIED':
        return '您沒有權限執行此操作';
      case 'NO_LEAD_DATA_FOUND':
        return '未找到相關的Lead數據，無法提供預填建議';
      case 'MISSING_ORDER_ID':
        return '缺少必需的訂單ID參數';
      default:
        return message || defaultMessage;
    }
  }
  
  return defaultMessage;
};
```

## 📱 前端實現建議

### Lead收集表單組件

```typescript
// 通用Lead收集表單
const LeadForm = ({ associationId, onSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    organization: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`/api/association/associations/${associationId}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        onSuccess(result.data.message);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          organization: '',
          message: ''
        });
      } else {
        throw new Error(result.error?.message || '提交失敗');
      }
    } catch (error) {
      console.error('提交失敗:', error);
      alert(handleApiError(error, '提交失敗，請稍後重試'));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="lead-form">
      <div className="form-row">
      <input
          type="text"
          placeholder="名字"
          value={formData.firstName}
          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="姓氏"
          value={formData.lastName}
          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
          required
        />
        </div>
      
      <input
        type="email"
        placeholder="郵箱"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required
      />
      
      <input
        type="tel"
        placeholder="電話（可選）"
        value={formData.phone}
        onChange={(e) => setFormData({...formData, phone: e.target.value})}
      />
      
      <input
        type="text"
        placeholder="公司/組織（可選）"
        value={formData.organization}
        onChange={(e) => setFormData({...formData, organization: e.target.value})}
      />
      
      <textarea
        placeholder="留言（可選）"
        value={formData.message}
        onChange={(e) => setFormData({...formData, message: e.target.value})}
        rows={3}
      />
      
      <button type="submit" disabled={loading}>
        {loading ? '提交中...' : '提交申請'}
      </button>
    </form>
  );
};
```

### Lead管理組件

```typescript
// Lead管理表格
const LeadManagement = ({ associationId }) => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    status: '',
    source: '',
    priority: ''
  });
  
  const { leads, pagination, loading } = useLeads(associationId, filters);
  
  return (
    <div className="lead-management">
      {/* 過濾器 */}
      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value, page: 1})}
        >
          <option value="">所有狀態</option>
          <option value="NEW">新Lead</option>
          <option value="CONTACTED">已聯繫</option>
          <option value="QUALIFIED">已驗證</option>
          <option value="CONVERTED">已轉換</option>
          <option value="REJECTED">已拒絕</option>
        </select>
        
        <select
          value={filters.source}
          onChange={(e) => setFilters({...filters, source: e.target.value, page: 1})}
        >
          <option value="">所有來源</option>
          <option value="WEBSITE_CONTACT">網站聯繫</option>
          <option value="PURCHASE_INTENT">購買意向</option>
          <option value="EVENT_REGISTRATION">活動註冊</option>
          <option value="REFERRAL">推薦</option>
          <option value="OTHER">其他</option>
        </select>
      </div>
      
      {/* Lead表格 */}
      {loading ? (
        <div>載入中...</div>
      ) : (
      <table className="lead-table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>郵箱</th>
            <th>公司</th>
            <th>來源</th>
            <th>狀態</th>
            <th>優先級</th>
            <th>創建時間</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {leads.map(lead => (
              <tr key={lead.id}>
              <td>{`${lead.firstName} ${lead.lastName}`}</td>
              <td>{lead.email}</td>
                <td>{lead.organization || '-'}</td>
                <td>{lead.source}</td>
                <td>{lead.status}</td>
                <td>{lead.priority}</td>
                <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
              <td>
                  <button onClick={() => handleEditLead(lead)}>編輯</button>
                  <button onClick={() => handleDeleteLead(lead.id)}>刪除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
      
      {/* 分頁 */}
      <div className="pagination">
        <button 
          disabled={filters.page === 1}
          onClick={() => setFilters({...filters, page: filters.page - 1})}
        >
          上一頁
        </button>
        <span>{filters.page} / {pagination.pages}</span>
        <button 
          disabled={filters.page === pagination.pages}
          onClick={() => setFilters({...filters, page: filters.page + 1})}
        >
          下一頁
        </button>
      </div>
    </div>
  );
};
```

## 🎯 總結

Lead收集系統提供了完整的潛在客戶管理解決方案：

### 🔥 核心功能
1. **多種Lead收集方式** - 支援基本表單、購買流程、Profile頁面等多種收集場景
2. **完整Lead管理** - 提供過濾、搜索、統計、CRUD等全面管理功能
3. **智能Profile預填** - 基於Lead數據自動生成Profile建議
4. **購買流程整合** - 與協會購買系統無縫整合

### 📈 業務價值
1. **提升轉換率** - 簡化用戶註冊和購買流程
2. **改善用戶體驗** - 智能預填減少用戶輸入負擔
3. **增強數據價值** - 完整追蹤用戶從Lead到轉換的全流程
4. **優化協會管理** - 提供詳細的Lead分析和管理工具

前端工程師可以根據本文檔快速集成Lead收集功能，為協會提供完整的潛在客戶管理解決方案。 