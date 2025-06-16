# NFC LinkCard Express 支付模塊前端開發指導文檔 (擴展版)（File Name: 20250616_FRONTEND_DEVELOPMENT_GUIDE_EXTENDED.md）

### 商業模式分析
NFC LinkCard Express 的支付模塊採用 **B2B2C 模式**：
- **平台**：提供會員管理和支付基礎設施
- **協會**：設置會員費方案，管理會員
- **用戶**：購買協會會員資格，享受會員權益

### 技術架構
- **後端**：Express.js + TypeScript + Prisma ORM
- **支付**：Stripe 集成（預留多支付商架構）
- **認證**：JWT Bearer Token
- **數據庫**：PostgreSQL

## 👥 用戶角色與權限

### 1. 協會管理員 (Association Admin)
**權限**：管理本協會的會員費方案和購買統計
**核心功能**：
- 創建/編輯/啟用/停用定價方案
- 查看協會會員購買統計
- 管理協會會員列表

### 2. 一般用戶 (Regular User)
**權限**：瀏覽和購買協會會員資格
**核心功能**：
- 瀏覽協會會員費方案
- 購買會員資格
- 查看個人購買歷史和會員狀態

### 3. 系統管理員 (System Admin)
**權限**：查看平台整體數據
**核心功能**：
- 查看平台支付統計
- 處理支付異常和退款

## 🎯 核心頁面需求

### 協會管理員頁面

#### 1. 定價方案管理頁面 (`/admin/association/pricing-plans`)

**頁面功能**：
- 顯示協會現有的三種會員等級方案（BASIC、PREMIUM、EXECUTIVE）
- 支援創建、編輯、啟用/停用方案
- 顯示每個方案的購買統計

**UI 需求**：
```typescript
// 頁面結構
interface PricingPlanManagementPage {
  header: {
    title: "會員費方案管理";
    createButton: "新增方案";
  };
  planList: PricingPlanCard[];
  statistics: {
    totalRevenue: string;
    totalMembers: number;
    monthlyGrowth: string;
  };
}

// 方案卡片組件
interface PricingPlanCard {
  id: string;
  name: string; // "BASIC", "PREMIUM", "EXECUTIVE"
  displayName: string; // "基礎會員", "高級會員", "執行會員"
  price: number;
  currency: string;
  billingCycle: "MONTHLY" | "YEARLY";
  isActive: boolean;
  memberCount: number;
  actions: ["編輯", "啟用/停用", "查看統計"];
}
```

**API 整合**：
```typescript
// 獲取協會定價方案
GET /api/payment/pricing-plans/association/{associationId}

// 創建方案
POST /api/payment/pricing-plans
{
  "name": "PREMIUM",
  "displayName": "高級會員",
  "description": "享受高級會員所有權益",
  "membershipTier": "PREMIUM",
  "price": 500,
  "currency": "HKD",
  "billingCycle": "YEARLY"
}

// 更新方案
PATCH /api/payment/pricing-plans/{id}

// 啟用/停用方案
PATCH /api/payment/pricing-plans/{id}/activate
PATCH /api/payment/pricing-plans/{id}/deactivate
```

#### 2. 會員購買統計頁面 (`/admin/association/purchase-stats`)

**頁面功能**：
- 顯示協會收入趨勢圖表
- 顯示會員購買列表
- 支援時間範圍篩選和搜索

**UI 需求**：
- 收入統計圖表（Chart.js 或類似）
- 購買訂單數據表格
- 篩選器：時間範圍、會員等級、支付狀態

### 用戶端頁面

#### 1. 協會詳情頁面 (`/association/{slug}`)

**頁面功能**：
- 顯示協會基本信息
- 展示三種會員等級的定價方案
- 提供購買入口

**UI 需求**：
```typescript
// 會員方案展示組件
interface MembershipPlansSection {
  title: "加入會員";
  plans: {
    BASIC: PricingPlanDisplay;
    PREMIUM: PricingPlanDisplay;
    EXECUTIVE: PricingPlanDisplay;
  };
}

interface PricingPlanDisplay {
  tier: "BASIC" | "PREMIUM" | "EXECUTIVE";
  displayName: string;
  price: number;
  currency: string;
  billingCycle: string;
  description: string;
  features: string[];
  purchaseButton: {
    text: "立即加入";
    disabled: boolean; // 如果已是會員則禁用
    loading: boolean; // 處理中狀態
  };
}
```

**API 整合**：
```typescript
// 獲取協會定價方案（公開API，無需認證）
GET /api/payment/pricing-plans/association/{associationId}

// 檢查用戶會員狀態（需認證）
GET /api/association/{associationId}/membership-status
```

#### 2. 支付確認頁面 (`/payment/confirm`)

**頁面功能**：
- 顯示選中的會員方案詳情
- 確認支付信息
- 處理支付流程

**UI 需求**：
```typescript
interface PaymentConfirmPage {
  selectedPlan: {
    associationName: string;
    planDisplayName: string;
    price: number;
    currency: string;
    billingCycle: string;
  };
  userInfo: {
    email: string;
    username: string;
  };
  paymentButton: {
    text: "前往支付";
    loading: boolean;
  };
  termsCheckbox: boolean;
}
```

**支付流程**：
```typescript
// 1. 創建購買訂單
const createOrder = async (pricingPlanId: string) => {
  const response = await fetch('/api/payment/purchase-orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pricingPlanId,
      successUrl: `${window.location.origin}/payment/success`,
      cancelUrl: `${window.location.origin}/payment/cancel`
    })
  });
  
  const { data } = await response.json();
  
  // 2. 重定向到 Stripe Checkout
  window.location.href = data.checkoutUrl;
};
```

#### 3. 支付結果頁面

**成功頁面** (`/payment/success`)：
- 顯示支付成功信息
- 顯示會員權益生效時間
- 提供返回協會或個人中心的連結

**取消頁面** (`/payment/cancel`)：
- 顯示支付取消信息
- 提供重新支付的選項

#### 4. 個人會員中心 (`/user/memberships`)

**頁面功能**：
- 顯示用戶在所有協會的會員狀態
- 顯示購買歷史
- 會員續費提醒

**UI 需求**：
```typescript
interface MembershipCenterPage {
  activeMemberships: {
    associationName: string;
    membershipTier: "BASIC" | "PREMIUM" | "EXECUTIVE";
    startDate: string;
    endDate: string;
    status: "ACTIVE" | "EXPIRED" | "PENDING";
  }[];
  purchaseHistory: PurchaseOrder[];
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  associationName: string;
  planDisplayName: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  createdAt: string;
  paidAt?: string;
}
```

**API 整合**：
```typescript
// 獲取用戶購買訂單列表
GET /api/payment/purchase-orders
Authorization: Bearer {token}

// 獲取用戶會員狀態
GET /api/user/memberships
Authorization: Bearer {token}
```

#### 5. 購買訂單詳情頁面 (`/user/orders/{orderId}`)

**頁面功能**：
- 顯示訂單詳細信息
- 顯示支付狀態和時間線
- 提供重新支付選項（如果訂單失敗）

## 🔧 技術實現指南

### 1. 狀態管理建議

使用 React Context 或 Redux 管理以下狀態：

```typescript
interface PaymentState {
  user: {
    memberships: UserMembership[];
    purchaseOrders: PurchaseOrder[];
  };
  associations: {
    [associationId: string]: {
      pricingPlans: PricingPlan[];
      membershipStatus?: UserMembershipStatus;
    };
  };
  payment: {
    selectedPlan?: PricingPlan;
    loading: boolean;
    error?: string;
  };
}
```

### 2. 錯誤處理策略

```typescript
// API 錯誤處理
const handleApiError = (error: ApiError) => {
  switch (error.status) {
    case 400:
      // 顯示表單驗證錯誤
      break;
    case 401:
      // 重定向到登入頁面
      router.push('/login');
      break;
    case 403:
      // 顯示權限不足提示
      break;
    case 404:
      // 顯示資源不存在
      break;
    case 500:
      // 顯示系統錯誤
      break;
  }
};
```

### 3. 認證處理

```typescript
// API 客戶端設置
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// 自動添加認證頭
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 處理認證失敗
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 4. 支付流程實現

```typescript
// Stripe Checkout 整合
const handlePurchase = async (pricingPlanId: string) => {
  try {
    setLoading(true);
    
    // 創建購買訂單
    const response = await apiClient.post('/api/payment/purchase-orders', {
      pricingPlanId,
      successUrl: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/payment/cancel`
    });
    
    // 重定向到 Stripe Checkout
    window.location.href = response.data.data.checkoutUrl;
    
  } catch (error) {
    handleApiError(error);
  } finally {
    setLoading(false);
  }
};

// 支付成功後處理
const handlePaymentSuccess = async (sessionId: string) => {
  try {
    // 驗證支付狀態並更新本地狀態
    await refreshUserMemberships();
    showSuccessMessage('會員購買成功！');
  } catch (error) {
    console.error('Failed to update membership status:', error);
  }
};
```

## 📱 響應式設計考慮

### 移動端優化
- 會員方案卡片在移動端採用垂直排列
- 支付確認頁面使用底部固定按鈕
- 統計圖表適配小螢幕顯示

### 組件設計建議
```typescript
// 響應式會員方案組件
const MembershipPlans = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map(plan => (
        <PricingPlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
};
```

## 🚀 開發優先級建議

### Phase 1: MVP 核心功能
1. 協會定價方案展示頁面
2. 用戶購買流程（確認 → 支付 → 結果）
3. 基本的個人會員中心

### Phase 2: 管理功能
1. 協會管理員定價方案管理
2. 購買統計和報表
3. 進階的會員管理功能

### Phase 3: 優化與增強
1. 移動端優化
2. 支付失敗重試機制
3. 會員續費提醒
4. 多支付商支援

## 🧪 測試建議

### 支付流程測試
- 使用 Stripe 測試卡號進行端到端測試
- 測試支付成功、失敗、取消等場景
- 驗證 Webhook 處理的時序問題

### 權限測試
- 測試不同用戶角色的頁面訪問權限
- 驗證未登入用戶的行為
- 測試會員狀態變更的即時性

這份指導文檔提供了完整的前端開發藍圖，讓前端工程師可以清晰了解需要實現的功能和技術要求。建議按照優先級分階段開發，確保核心支付流程能夠穩定運行。


### 商業模式分析
NFC LinkCard Express 的支付模塊採用 **B2B2C 模式**：

```mermaid
graph TD
    A[平台 Platform] --> B[協會 Association]
    B --> C[用戶 User]
    
    A --> |提供| D[支付基礎設施]
    A --> |提供| E[會員管理系統]
    
    B --> |設置| F[會員費方案]
    B --> |管理| G[協會會員]
    
    C --> |購買| H[會員資格]
    C --> |享受| I[會員權益]
    
    D --> F
    E --> G
    F --> H
    H --> I
```

### 技術架構總覽

```mermaid
graph TB
    subgraph "前端 Frontend"
        A[React/Next.js]
        B[狀態管理 Redux/Context]
        C[UI 組件庫]
    end
    
    subgraph "後端 Backend"
        D[Express.js + TypeScript]
        E[Prisma ORM]
        F[JWT 認證]
    end
    
    subgraph "支付層 Payment"
        G[Stripe API]
        H[PaymentProvider 接口]
        I[多支付商架構]
    end
    
    subgraph "數據層 Database"
        J[PostgreSQL]
        K[Redis 快取]
    end
    
    A --> D
    B --> A
    C --> A
    D --> E
    D --> F
    D --> H
    H --> G
    H --> I
    E --> J
    D --> K
```

## 👥 用戶角色與權限

### 角色權限關係圖

```mermaid
graph TD
    subgraph "用戶角色 User Roles"
        A[系統管理員<br/>System Admin]
        B[協會管理員<br/>Association Admin]
        C[一般用戶<br/>Regular User]
    end
    
    subgraph "支付功能 Payment Features"
        D[查看平台統計]
        E[管理定價方案]
        F[查看協會收入]
        G[購買會員資格]
        H[查看購買歷史]
        I[處理退款]
    end
    
    A --> D
    A --> I
    A --> |查看所有| F
    
    B --> E
    B --> F
    B --> |管理協會| H
    
    C --> G
    C --> |個人| H
```

### 頁面訪問權限矩陣

```mermaid
graph TB
    subgraph "頁面 Pages"
        P1[定價方案管理]
        P2[購買統計]
        P3[協會詳情]
        P4[支付確認]
        P5[個人會員中心]
        P6[系統統計]
    end
    
    subgraph "角色 Roles"
        R1[系統管理員]
        R2[協會管理員]
        R3[一般用戶]
    end
    
    R1 --> |✅ 全部權限| P1
    R1 --> |✅ 全部權限| P2
    R1 --> |✅ 全部權限| P6
    
    R2 --> |✅ 本協會| P1
    R2 --> |✅ 本協會| P2
    
    R3 --> |✅ 只讀| P3
    R3 --> |✅ 購買| P4
    R3 --> |✅ 個人| P5
```

## 🔄 核心業務流程

### 完整支付流程時序圖

```mermaid
sequenceDiagram
    participant U as 用戶
    participant F as 前端
    participant B as 後端
    participant S as Stripe
    participant W as Webhook
    
    Note over U,W: 1. 瀏覽會員方案
    U->>F: 訪問協會頁面
    F->>B: GET /pricing-plans/association/{id}
    B->>F: 返回方案列表
    F->>U: 顯示會員方案
    
    Note over U,W: 2. 選擇並確認購買
    U->>F: 選擇會員方案
    F->>U: 顯示支付確認頁面
    U->>F: 確認購買
    
    Note over U,W: 3. 創建訂單和支付會話
    F->>B: POST /purchase-orders
    B->>S: 創建 Checkout Session
    S->>B: 返回 Session URL
    B->>F: 返回訂單和支付鏈接
    F->>U: 重定向到 Stripe
    
    Note over U,W: 4. 處理支付
    U->>S: 完成支付
    S->>W: 發送 Webhook 事件
    W->>B: 處理支付成功事件
    B->>B: 更新訂單狀態
    B->>B: 創建會員記錄
    S->>U: 重定向到成功頁面
    
    Note over U,W: 5. 確認結果
    U->>F: 訪問成功頁面
    F->>B: 驗證支付狀態
    B->>F: 返回會員信息
    F->>U: 顯示會員權益
```

### 協會管理員工作流程

```mermaid
flowchart TD
    A[登入系統] --> B{是否為協會管理員？}
    B -->|否| C[訪問被拒絕]
    B -->|是| D[進入管理後台]
    
    D --> E[定價方案管理]
    D --> F[會員統計查看]
    
    E --> G[創建新方案]
    E --> H[編輯現有方案]
    E --> I[啟用/停用方案]
    
    G --> J[設置方案信息]
    J --> K[設置價格和週期]
    K --> L[創建 Stripe 產品]
    L --> M[保存到數據庫]
    
    H --> N[更新方案信息]
    N --> O[同步到 Stripe]
    O --> P[更新數據庫]
    
    F --> Q[查看收入統計]
    F --> R[查看會員列表]
    F --> S[查看購買訂單]
```

## 🎯 核心頁面需求與結構

### 頁面導航結構圖

```mermaid
graph TD
    subgraph "公開頁面 Public Pages"
        A[首頁 Home]
        B[協會詳情 Association Detail]
        C[登入 Login]
        D[註冊 Register]
    end
    
    subgraph "用戶頁面 User Pages"
        E[個人會員中心 Membership Center]
        F[購買歷史 Purchase History]
        G[訂單詳情 Order Detail]
        H[支付確認 Payment Confirm]
        I[支付結果 Payment Result]
    end
    
    subgraph "管理頁面 Admin Pages"
        J[協會管理後台 Admin Dashboard]
        K[定價方案管理 Pricing Plans]
        L[會員統計 Member Stats]
        M[購買統計 Purchase Stats]
    end
    
    A --> B
    B --> C
    C --> E
    E --> F
    F --> G
    B --> H
    H --> I
    
    C --> J
    J --> K
    J --> L
    J --> M
```

### 協會詳情頁面組件結構

```mermaid
graph TD
    A[協會詳情頁面] --> B[協會信息區塊]
    A --> C[會員方案展示區塊]
    A --> D[用戶操作區塊]
    
    B --> E[協會 Logo]
    B --> F[協會名稱]
    B --> G[協會描述]
    
    C --> H[BASIC 方案卡片]
    C --> I[PREMIUM 方案卡片]
    C --> J[EXECUTIVE 方案卡片]
    
    H --> K[價格顯示]
    H --> L[功能列表]
    H --> M[購買按鈕]
    
    I --> K
    I --> L
    I --> M
    
    J --> K
    J --> L
    J --> M
    
    D --> N[會員狀態顯示]
    D --> O[加入會員按鈕]
```

### 支付確認頁面流程

```mermaid
flowchart TD
    A[進入支付確認頁面] --> B[顯示選中方案]
    B --> C[顯示用戶信息]
    C --> D[顯示價格詳情]
    D --> E{用戶確認？}
    
    E -->|取消| F[返回協會頁面]
    E -->|確認| G[調用創建訂單 API]
    
    G --> H{API 調用成功？}
    H -->|失敗| I[顯示錯誤信息]
    H -->|成功| J[獲取 Stripe URL]
    
    J --> K[重定向到 Stripe Checkout]
    K --> L[用戶完成支付]
    L --> M[返回成功/失敗頁面]
```

## 🔧 API 整合架構

### API 端點結構圖

```mermaid
graph TB
    subgraph "API 路由 API Routes"
        A[/api/payment]
    end
    
    subgraph "定價方案 Pricing Plans"
        B[GET /pricing-plans/association/{id}]
        C[GET /pricing-plans/{id}]
        D[POST /pricing-plans]
        E[PATCH /pricing-plans/{id}]
        F[PATCH /pricing-plans/{id}/activate]
        G[PATCH /pricing-plans/{id}/deactivate]
    end
    
    subgraph "購買訂單 Purchase Orders"
        H[POST /purchase-orders]
        I[GET /purchase-orders]
        J[GET /purchase-orders/{id}]
        K[POST /purchase-orders/webhook]
    end
    
    A --> B
    A --> C
    A --> D
    A --> E
    A --> F
    A --> G
    A --> H
    A --> I
    A --> J
    A --> K
```

### 數據流程圖

```mermaid
flowchart LR
    subgraph "前端組件 Frontend Components"
        A[PricingPlanCard]
        B[PaymentConfirm]
        C[OrderHistory]
    end
    
    subgraph "API 層 API Layer"
        D[PricingPlanController]
        E[PurchaseOrderController]
    end
    
    subgraph "服務層 Service Layer"
        F[PricingPlanService]
        G[PurchaseOrderService]
        H[PaymentService]
    end
    
    subgraph "數據層 Data Layer"
        I[Prisma ORM]
        J[PostgreSQL]
    end
    
    subgraph "外部服務 External Services"
        K[Stripe API]
    end
    
    A --> D
    B --> E
    C --> E
    
    D --> F
    E --> G
    
    F --> I
    G --> I
    G --> H
    H --> K
    
    I --> J
```

## 📊 數據庫關係圖

```mermaid
erDiagram
    Association ||--o{ PricingPlan : "has"
    Association ||--o{ PurchaseOrder : "receives"
    Association ||--o{ AssociationMember : "has"
    
    User ||--o{ PurchaseOrder : "makes"
    User ||--o{ AssociationMember : "becomes"
    
    PricingPlan ||--o{ PurchaseOrder : "includes"
    PricingPlan {
        string id PK
        string associationId FK
        string name
        string displayName
        string membershipTier
        decimal price
        string currency
        string billingCycle
        boolean isActive
    }
    
    PurchaseOrder {
        string id PK
        string associationId FK
        string userId FK
        string pricingPlanId FK
        string orderNumber
        decimal amount
        string currency
        string status
        json stripeData
        datetime membershipStartDate
        datetime membershipEndDate
    }
    
    AssociationMember {
        string id PK
        string associationId FK
        string userId FK
        string membershipTier
        string membershipStatus
        datetime joinedAt
        datetime expiresAt
    }
```

## 🎨 UI/UX 設計指南

### 會員方案卡片設計

```mermaid
graph TD
    A[會員方案卡片] --> B[頂部標題區]
    A --> C[價格顯示區]
    A --> D[功能列表區]
    A --> E[底部按鈕區]
    
    B --> F[會員等級徽章]
    B --> G[方案名稱]
    
    C --> H[主要價格]
    C --> I[計費週期]
    C --> J[貨幣符號]
    
    D --> K[功能項目 1]
    D --> L[功能項目 2]
    D --> M[功能項目 3]
    
    E --> N[購買按鈕]
    E --> O[按鈕狀態管理]
```

### 響應式設計斷點

```mermaid
graph LR
    A[Mobile<br/>< 768px] --> B[Tablet<br/>768px - 1024px] --> C[Desktop<br/>> 1024px]
    
    A --> D[垂直排列<br/>單列顯示]
    B --> E[2列網格<br/>適中間距]
    C --> F[3列網格<br/>寬鬆佈局]
```

## 🔄 狀態管理架構

### Redux/Context 狀態樹

```mermaid
graph TD
    A[應用狀態 App State] --> B[認證狀態 Auth]
    A --> C[支付狀態 Payment]
    A --> D[用戶狀態 User]
    A --> E[UI 狀態 UI]
    
    B --> F[用戶信息 userInfo]
    B --> G[認證狀態 isAuthenticated]
    B --> H[權限列表 permissions]
    
    C --> I[定價方案 pricingPlans]
    C --> J[購買訂單 purchaseOrders]
    C --> K[支付流程 paymentFlow]
    
    D --> L[會員狀態 memberships]
    D --> M[個人資料 profile]
    
    E --> N[載入狀態 loading]
    E --> O[錯誤信息 errors]
    E --> P[通知信息 notifications]
```

### 狀態更新流程

```mermaid
sequenceDiagram
    participant C as Component
    participant A as Action
    participant R as Reducer
    participant S as Store
    participant API as API
    
    C->>A: dispatch(action)
    A->>API: API 調用
    API->>A: 返回數據
    A->>R: action + payload
    R->>S: 更新狀態
    S->>C: 通知組件更新
    C->>C: 重新渲染
```

## 🛠️ 開發工作流程

### 功能開發流程

```mermaid
flowchart TD
    A[需求分析] --> B[API 設計]
    B --> C[數據模型設計]
    C --> D[組件設計]
    D --> E[狀態管理設計]
    
    E --> F[開發 API 整合]
    F --> G[開發 UI 組件]
    G --> H[整合狀態管理]
    H --> I[編寫測試]
    
    I --> J[本地測試]
    J --> K{測試通過？}
    K -->|否| L[修復問題]
    K -->|是| M[代碼審查]
    
    L --> J
    M --> N[部署到測試環境]
    N --> O[UAT 測試]
    O --> P[部署到生產環境]
```

### Git 分支策略

```mermaid
gitgraph
    commit id: "初始化"
    branch develop
    checkout develop
    commit id: "開發環境設置"
    
    branch feature/payment-ui
    checkout feature/payment-ui
    commit id: "支付頁面組件"
    commit id: "支付流程邏輯"
    
    checkout develop
    merge feature/payment-ui
    
    branch feature/admin-dashboard
    checkout feature/admin-dashboard
    commit id: "管理後台頁面"
    commit id: "統計圖表組件"
    
    checkout develop
    merge feature/admin-dashboard
    
    checkout main
    merge develop
    commit id: "發布 v1.0"
```

## 🧪 測試策略

### 測試金字塔

```mermaid
graph TD
    A[E2E 測試<br/>Cypress/Playwright] --> B[集成測試<br/>React Testing Library]
    B --> C[單元測試<br/>Jest + Enzyme]
    
    style A fill:#ff6b6b
    style B fill:#4ecdc4
    style C fill:#45b7d1
    
    D[測試覆蓋度目標] --> E[E2E: 核心流程 100%]
    D --> F[集成: 組件交互 90%]
    D --> G[單元: 工具函數 95%]
```

### 支付流程測試案例

```mermaid
flowchart TD
    A[支付流程測試] --> B[正常流程測試]
    A --> C[異常流程測試]
    A --> D[邊界情況測試]
    
    B --> E[選擇方案]
    B --> F[確認支付]
    B --> G[完成支付]
    B --> H[驗證會員狀態]
    
    C --> I[支付失敗]
    C --> J[網絡錯誤]
    C --> K[會話過期]
    
    D --> L[重複購買]
    D --> M[無效方案]
    D --> N[未登入用戶]
```

## 🚀 部署與監控

### 部署流程圖

```mermaid
graph TD
    A[代碼提交] --> B[CI/CD 流水線]
    B --> C[構建應用]
    C --> D[運行測試]
    D --> E{測試通過？}
    
    E -->|否| F[通知開發者]
    E -->|是| G[構建 Docker 鏡像]
    
    G --> H[推送到倉庫]
    H --> I[部署到測試環境]
    I --> J[自動化測試]
    J --> K{測試通過？}
    
    K -->|否| L[回滾版本]
    K -->|是| M[部署到生產環境]
    
    M --> N[健康檢查]
    N --> O[監控告警]
```

### 監控指標

```mermaid
graph TB
    A[監控指標] --> B[性能指標]
    A --> C[業務指標]
    A --> D[錯誤指標]
    
    B --> E[頁面載入時間]
    B --> F[API 響應時間]
    B --> G[資源使用率]
    
    C --> H[支付成功率]
    C --> I[用戶轉換率]
    C --> J[會員增長率]
    
    D --> K[API 錯誤率]
    D --> L[支付失敗率]
    D --> M[頁面錯誤率]
```

## 📱 移動端適配

### 響應式組件設計

```mermaid
graph TD
    A[響應式設計] --> B[斷點設計]
    A --> C[組件適配]
    A --> D[交互優化]
    
    B --> E[Mobile: 320px-768px]
    B --> F[Tablet: 768px-1024px]
    B --> G[Desktop: 1024px+]
    
    C --> H[卡片式佈局]
    C --> I[可收縮側欄]
    C --> J[底部固定按鈕]
    
    D --> K[觸控友好]
    D --> L[快速支付]
    D --> M[簡化流程]
```

### PWA 功能規劃

```mermaid
graph LR
    A[PWA 功能] --> B[離線支持]
    A --> C[推送通知]
    A --> D[應用安裝]
    
    B --> E[快取關鍵頁面]
    B --> F[離線提示]
    
    C --> G[支付完成通知]
    C --> H[會員到期提醒]
    
    D --> I[添加到主螢幕]
    D --> J[啟動畫面]
```

## 🔒 安全考慮

### 前端安全檢查清單

```mermaid
graph TD
    A[前端安全] --> B[認證安全]
    A --> C[數據安全]
    A --> D[支付安全]
    
    B --> E[Token 管理]
    B --> F[會話過期]
    B --> G[權限檢查]
    
    C --> H[輸入驗證]
    C --> I[XSS 防護]
    C --> J[CSRF 防護]
    
    D --> K[PCI DSS 合規]
    D --> L[敏感信息處理]
    D --> M[Stripe Elements]
```

## 📋 開發檢查清單

### 功能完成檢查

```mermaid
graph TD
    A[功能檢查清單] --> B[核心功能]
    A --> C[用戶體驗]
    A --> D[性能優化]
    A --> E[安全檢查]
    
    B --> F[✅ API 整合]
    B --> G[✅ 支付流程]
    B --> H[✅ 狀態管理]
    
    C --> I[✅ 響應式設計]
    C --> J[✅ 載入狀態]
    C --> K[✅ 錯誤處理]
    
    D --> L[✅ 代碼分割]
    D --> M[✅ 圖片優化]
    D --> N[✅ 快取策略]
    
    E --> O[✅ 輸入驗證]
    E --> P[✅ 權限控制]
    E --> Q[✅ 敏感信息保護]
```

這個擴展版本的文檔包含了豐富的 Mermaid 圖表，能夠幫助前端工程師更直觀地理解整個支付系統的架構、流程和實現細節。圖表涵蓋了從系統架構到具體實現的各個層面，讓開發工作更加清晰和高效。 