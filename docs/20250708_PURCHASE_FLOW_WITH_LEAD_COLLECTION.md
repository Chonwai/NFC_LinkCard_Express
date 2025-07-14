# 購買流程Lead收集功能技術文檔 (File Name: 20250708_PURCHASE_FLOW_WITH_LEAD_COLLECTION.md)

**版本**: 1.0  
**日期**: 2024年1月  
**狀態**: 開發中  
**負責人**: 後端工程師 & 產品經理  

---

## 📋 文檔概覽

### 背景
基於內部測試用戶反饋，需要優化協會會員購買流程，在用戶購買前收集Lead信息，並解決新建Profile空白的問題。

### 目標
1. **簡化購買流程** - 陌生用戶可以一站式完成註冊和購買
2. **提升Lead質量** - 區分付款意向Lead和一般網站Lead  
3. **改善Profile體驗** - 新建Profile自動預填基本信息
4. **增強數據價值** - 完整追蹤用戶購買行為

---

## 🎯 業務流程設計

### 現有流程 (需要優化)
```
訪客 → 註冊頁面 → 登入 → 瀏覽協會 → 選擇方案 → 支付
```

### 優化後流程 (目標)
```
訪客 → 瀏覽協會 → 選擇方案 → 📝 一站式註冊+Lead收集 → 自動登入 → 支付 → Profile預填
```

### 關鍵改進點
- **前置Lead收集** - 在支付前收集用戶基本信息
- **自動用戶註冊** - 基於Lead信息自動創建用戶帳戶
- **智能Profile預填** - 使用Lead數據豐富新建Profile
- **來源標記** - 區分付款意向Lead和網站聯繫Lead

---

## 🎨 前端UI/UX流程設計

### 1. 協會介紹頁面
**頁面**: `/associations/{slug}`

**現有功能**:
- 顯示協會基本信息
- 展示可用會員方案
- "立即加入"按鈕

**新增功能**:
- **智能CTA按鈕** - 根據用戶登入狀態顯示不同文案
  - 未登入用戶: "立即註冊並加入" 
  - 已登入用戶: "選擇會員方案"

### 2. 會員方案選擇頁面
**頁面**: `/associations/{slug}/plans`

**流程分支**:
```typescript
if (用戶已登入) {
  // 現有流程：直接進入支付
  navigateTo('/payment/checkout')
} else {
  // 新流程：顯示註冊+Lead收集表單
  showRegistrationWithLeadForm()
}
```

### 3. 一站式註冊+Lead收集表單 ⭐ 核心新功能
**模態框組件**: `RegistrationWithLeadModal`

**表單字段設計**:
```typescript
interface RegistrationWithLeadForm {
  // 👤 用戶註冊信息
  username: string;           // 用戶名 (必填)
  email: string;             // 郵箱 (必填)  
  password: string;          // 密碼 (必填)
  
  // 📝 Lead收集信息
  firstName: string;         // 名字 (必填)
  lastName: string;          // 姓氏 (必填)
  phone?: string;           // 電話 (可選)
  organization?: string;    // 組織/公司 (可選)
  message?: string;         // 備註 (可選)
  
  // 🎯 購買上下文 (隱藏字段)
  pricingPlanId: string;    // 選中的方案ID
  associationId: string;    // 協會ID
}
```

**UI/UX設計要求**:
```tsx
<Modal 
  title="加入 {associationName} - 完成註冊" 
  width={600}
  destroyOnClose
>
  <Steps current={0} size="small">
    <Step title="基本信息" />
    <Step title="確認支付" />
    <Step title="完成" />
  </Steps>
  
  <Form layout="vertical">
    <Divider orientation="left">帳戶信息</Divider>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="用戶名" required>
          <Input placeholder="請輸入用戶名" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="郵箱" required>
          <Input type="email" placeholder="your@email.com" />
        </Form.Item>
      </Col>
    </Row>
    
    <Divider orientation="left">個人信息</Divider>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="名字" required>
          <Input placeholder="請輸入名字" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="姓氏" required>
          <Input placeholder="請輸入姓氏" />
        </Form.Item>
      </Col>
    </Row>
    
    {/* 更多字段... */}
    
    <Form.Item>
      <Button type="primary" size="large" block>
        註冊並繼續支付 💳
      </Button>
    </Form.Item>
  </Form>
</Modal>
```

### 4. 支付成功後Profile創建
**頁面**: `/payment/success/{orderId}`

**新增流程**:
1. 顯示支付成功信息
2. **自動彈出Profile創建選項** 
3. **預填Lead數據到Profile表單**
4. 用戶確認創建或稍後創建

---

## 🔧 API接口規範

### 1. 註冊+Lead收集 API

#### `POST /api/auth/register-with-lead`

**描述**: 一站式註冊用戶並創建付款意向Lead

**請求體**:
```typescript
{
  // 用戶註冊信息
  "user": {
    "username": "johndoe",
    "email": "john@example.com", 
    "password": "SecurePass123!"
  },
  
  // Lead信息
  "lead": {
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+852 1234 5678",
    "organization": "Tech Corp",
    "message": "Looking forward to joining!"
  },
  
  // 購買上下文
  "purchaseContext": {
    "associationId": "assoc_123",
    "pricingPlanId": "plan_456"
  }
}
```

**成功響應** (201):
```typescript
{
  "success": true,
  "data": {
    "user": {
      "id": "user_789",
      "username": "johndoe",
      "email": "john@example.com",
      "isVerified": false
    },
    "lead": {
      "id": "lead_101112", 
      "source": "PURCHASE_INTENT",
      "status": "NEW"
    },
    "token": "jwt_token_here",
    "nextStep": {
      "action": "PROCEED_TO_PAYMENT",
      "checkoutUrl": "/payment/checkout?leadId=lead_101112"
    }
  }
}
```

**錯誤響應**:
```typescript
// 400 - 用戶已存在
{
  "success": false,
  "error": {
    "code": "USER_EXISTS",
    "message": "郵箱或用戶名已被使用",
    "details": {
      "conflictField": "email" | "username"
    }
  }
}

// 422 - 驗證錯誤  
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "表單驗證失敗",
    "details": [
      {
        "field": "password",
        "message": "密碼必須包含至少8個字符"
      }
    ]
  }
}
```

### 2. 創建購買訂單 API (擴展)

#### `POST /api/payment/purchase-orders`

**描述**: 創建購買訂單，支持Lead關聯

**請求體** (擴展現有):
```typescript
{
  "pricingPlanId": "plan_456",
  "leadId": "lead_101112",        // 🆕 新增Lead關聯
  "successUrl": "https://app.linkcard.com/success",
  "cancelUrl": "https://app.linkcard.com/cancel"
}
```

**成功響應**:
```typescript
{
  "success": true, 
  "data": {
    "order": {
      "id": "order_131415",
      "orderNumber": "ORDER-20240115-A1B2C3",
      "amount": 1000.00,
      "currency": "HKD",
      "status": "PENDING",
      "leadId": "lead_101112"     // 🆕 Lead關聯信息
    },
    "checkoutUrl": "https://checkout.stripe.com/pay/...",
    "estimatedCompletionTime": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Lead管理 API (擴展)

#### `GET /api/association/associations/{associationId}/leads`

**描述**: 獲取協會Lead列表，支持來源過濾

**查詢參數** (擴展現有):
```typescript
{
  "page": 1,
  "limit": 20,
  "source": "PURCHASE_INTENT" | "WEBSITE_CONTACT" | "ALL",  // 🆕 來源過濾
  "status": "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "REJECTED",
  "sortBy": "createdAt" | "priority",
  "sortOrder": "asc" | "desc"
}
```

**成功響應** (擴展現有):
```typescript
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": "lead_101112",
        "firstName": "John",
        "lastName": "Doe", 
        "email": "john@example.com",
        "phone": "+852 1234 5678",
        "organization": "Tech Corp",
        "message": "Looking forward to joining!",
        "status": "NEW",
        "source": "PURCHASE_INTENT",           // 🆕 來源標記
        "priority": "HIGH",                   // 🆕 優先級 (購買意向自動為HIGH)
        "metadata": {                         // 🆕 擴展元數據
          "purchaseContext": {
            "pricingPlanId": "plan_456",
            "planName": "Premium會員",
            "amount": 1000.00,
            "currency": "HKD"
          },
          "userRegistration": {
            "userId": "user_789",
            "registeredAt": "2024-01-15T10:00:00Z"
          }
        },
        "associationId": "assoc_123",
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    },
    "summary": {                              // 🆕 統計摘要
      "totalLeads": 45,
      "purchaseIntentLeads": 12,
      "websiteContactLeads": 33,
      "conversionRate": "26.7%"
    }
  }
}
```

### 4. Profile創建預填 API

#### `GET /api/payment/purchase-orders/{orderId}/profile-prefill-data`

**描述**: 獲取基於Lead數據的Profile預填信息

**成功響應**:
```typescript
{
  "success": true,
  "data": {
    "suggestedProfile": {
      "name": "John Doe - Tech Corp Premium會員",
      "description": "Premium member of MyAssociation",
      "bio": "Tech professional from Tech Corp",
      "contactInfo": {
        "email": "john@example.com",
        "phone": "+852 1234 5678"
      }
    },
    "leadData": {
      "firstName": "John",
      "lastName": "Doe",
      "organization": "Tech Corp",
      "message": "Looking forward to joining!"
    },
    "canCreateProfile": true,
    "membershipInfo": {
      "tier": "PREMIUM",
      "validUntil": "2025-01-15T10:00:00Z"
    }
  }
}
```

#### `POST /api/payment/purchase-orders/{orderId}/association-profile`

**描述**: 基於Lead數據創建協會專屬Profile (擴展現有)

**請求體** (自動預填，用戶可修改):
```typescript
{
  "name": "John Doe - Tech Corp Premium會員",  // 基於Lead數據預填
  "description": "Premium member of MyAssociation",
  "bio": "Tech professional from Tech Corp",
  "useLeadData": true,                        // 🆕 是否使用Lead數據
  "customizations": {                         // 🆕 用戶自定義覆蓋
    "name": "Custom Name",
    "description": "Custom Description"
  }
}
```

---

## 📊 數據模型變更

### AssociationLead模型擴展

```typescript
// prisma/schema.prisma
model AssociationLead {
  id                String              @id @default(uuid())
  firstName         String              @map("first_name")
  lastName          String              @map("last_name") 
  email             String
  phone             String?
  organization      String?
  message           String?
  status            AssociationLeadStatus @default(NEW)
  
  // 🆕 新增字段
  source            String?             @default("WEBSITE_CONTACT") // "PURCHASE_INTENT" | "WEBSITE_CONTACT"
  priority          String?             @default("MEDIUM")          // "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  purchaseOrderId   String?             @map("purchase_order_id")   // 關聯訂單
  userId            String?             @map("user_id")             // 關聯用戶  
  metadata          Json?                                           // 擴展數據
  
  associationId     String              @map("association_id")
  createdAt         DateTime            @default(now()) @map("created_at")
  updatedAt         DateTime            @updatedAt @map("updated_at")

  // 關聯
  association       Association         @relation(fields: [associationId], references: [id])
  purchaseOrder     PurchaseOrder?      @relation(fields: [purchaseOrderId], references: [id])  // 🆕
  user              User?               @relation(fields: [userId], references: [id])            // 🆕

  @@map("association_leads")
}
```

### PurchaseOrder模型擴展

```typescript
model PurchaseOrder {
  // 現有字段...
  leadId            String?             @map("lead_id")              // 🆕 Lead關聯
  
  // 關聯  
  lead              AssociationLead?    @relation(fields: [leadId], references: [id])  // 🆕
}
```

---

## 🔄 前端狀態管理

### Redux Store設計

```typescript
// store/purchaseFlow.ts
interface PurchaseFlowState {
  currentStep: 'PLAN_SELECTION' | 'REGISTRATION_LEAD' | 'PAYMENT' | 'SUCCESS';
  selectedPlan: PricingPlan | null;
  leadData: LeadFormData | null;
  registrationData: UserRegistrationData | null;
  paymentData: PaymentData | null;
  errors: Record<string, string>;
  loading: boolean;
}

// Actions
const purchaseFlowSlice = createSlice({
  name: 'purchaseFlow',
  initialState,
  reducers: {
    selectPlan: (state, action) => {
      state.selectedPlan = action.payload;
      state.currentStep = 'REGISTRATION_LEAD';
    },
    
    submitRegistrationWithLead: (state, action) => {
      state.leadData = action.payload.lead;
      state.registrationData = action.payload.user;
      state.currentStep = 'PAYMENT';
    },
    
    completePayment: (state, action) => {
      state.paymentData = action.payload;
      state.currentStep = 'SUCCESS';
    }
  }
});
```

### API調用封裝

```typescript
// services/purchaseApi.ts
export class PurchaseApiService {
  static async registerWithLead(data: RegistrationWithLeadData): Promise<ApiResponse> {
    return await apiClient.post('/api/auth/register-with-lead', data);
  }
  
  static async createPurchaseOrder(data: CreatePurchaseOrderData): Promise<ApiResponse> {
    return await apiClient.post('/api/payment/purchase-orders', data);
  }
  
  static async getProfilePrefillData(orderId: string): Promise<ApiResponse> {
    return await apiClient.get(`/api/payment/purchase-orders/${orderId}/profile-prefill-data`);
  }
}
```

---

## 🧪 測試策略

### 1. 前端測試

**單元測試**:
```typescript
// tests/components/RegistrationWithLeadModal.test.tsx
describe('RegistrationWithLeadModal', () => {
  it('should validate required fields', async () => {
    // 測試必填字段驗證
  });
  
  it('should submit form with correct data structure', async () => {
    // 測試表單提交數據格式
  });
  
  it('should handle API errors gracefully', async () => {
    // 測試錯誤處理
  });
});
```

**集成測試**:
```typescript
// tests/flows/purchase-flow.test.tsx  
describe('Purchase Flow Integration', () => {
  it('should complete end-to-end purchase with registration', async () => {
    // 測試完整購買流程
  });
});
```

### 2. API測試

**Postman Collection**: 創建完整的API測試集合
- 註冊+Lead收集 API
- 購買訂單創建 API  
- Lead管理 API
- Profile預填 API

### 3. 用戶體驗測試

**測試場景**:
1. **陌生用戶購買流程** - 從協會頁面到支付完成
2. **已註冊用戶購買** - 確保現有流程不受影響
3. **錯誤處理** - 網絡錯誤、表單驗證錯誤等
4. **移動端體驗** - 響應式設計和觸摸友好

---

## 📈 成功指標與監控

### 業務指標

| 指標 | 目標 | 測量方式 |
|------|------|----------|
| 購買轉換率 | 提升20% | 從方案選擇到支付完成的轉換率 |
| 註冊轉換率 | >85% | Lead收集表單完成率 |
| Profile完整度 | >70% | 新建Profile包含基本信息的比例 |
| Lead質量 | 提升30% | 付款意向Lead轉換為付費會員的比例 |

### 技術指標

| 指標 | 目標 | 監控方式 |
|------|------|----------|
| API響應時間 | <500ms | APM工具監控 |
| 錯誤率 | <1% | 錯誤日誌分析 |
| 前端性能 | LCP <2.5s | Web Vitals監控 |
| 移動端體驗 | 無布局錯位 | 跨設備測試 |

---

## 🚀 實施時間線

### Phase 1: 後端API開發 (3-4天)
- **Day 1-2**: 數據庫模型擴展和遷移
- **Day 3**: 註冊+Lead收集 API開發
- **Day 4**: 購買訂單API擴展和Profile預填API

### Phase 2: 前端UI開發 (4-5天)  
- **Day 1-2**: 一站式註冊Modal組件開發
- **Day 3**: 購買流程狀態管理和路由調整
- **Day 4**: Profile創建預填功能
- **Day 5**: 樣式優化和響應式調整

### Phase 3: 集成測試與優化 (2天)
- **Day 1**: API集成測試和錯誤處理
- **Day 2**: 用戶體驗測試和性能優化

### Phase 4: 部署與監控 (1天)
- **Day 1**: 生產環境部署和監控配置

**總計**: 約10-12個工作日

---

## 🔒 安全考慮

### 數據保護
- **敏感信息加密** - 電話號碼、郵箱等PII數據
- **GDPR合規** - 數據收集同意和刪除權限  
- **密碼安全** - bcrypt加密，密碼強度驗證

### API安全
- **速率限制** - 防止惡意註冊和API濫用
- **輸入驗證** - 所有用戶輸入都需要後端驗證
- **CSRF保護** - 表單提交CSRF token驗證

### 業務邏輯安全
- **重複註冊檢查** - 防止同一郵箱重複註冊
- **訂單驗證** - 確保Lead和訂單的正確關聯
- **權限檢查** - 確保用戶只能訪問自己的訂單和Profile

---

## 📞 技術支持與聯繫

### 開發團隊聯繫方式
- **後端負責人**: backend-team@linkcard.com
- **前端負責人**: frontend-team@linkcard.com  
- **產品經理**: product@linkcard.com

### 文檔更新
- **Git倉庫**: 本文檔將與代碼一起進行版本控制
- **更新頻率**: 每個Sprint結束後更新
- **反饋渠道**: 通過GitHub Issues或Slack #dev-purchase-flow頻道

---

## 📝 變更日誌

| 版本 | 日期 | 變更內容 | 負責人 |
|------|------|----------|--------|
| 1.0 | 2024-01-15 | 初始版本，完整技術規範 | Backend Team |

---

**文檔完成！** ✅

此文檔提供了購買流程Lead收集功能的完整技術實施指南，涵蓋前端UI設計、API規範、數據模型、測試策略和實施時間線。前端和後端團隊可以基於此文檔進行並行開發。 