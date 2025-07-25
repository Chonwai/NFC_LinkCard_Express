# 協會版功能實現總結

## 已實現功能

### 1. 批量邀請功能

1. **批量邀請會員 API** (`POST /associations/:id/batch-invite`)
   - 接收會員列表，處理並發送邀請
   - 支持邀請現有用戶和創建臨時帳戶
   - 返回詳細處理結果（成功、失敗、已存在等）
   - **兼容路径**：`POST /associations/:id/members/batch-invite`（推荐使用）

2. **CSV 文件處理 API** (`POST /associations/:id/process-csv`)
   - 解析上傳的CSV文件
   - 驗證電子郵件格式和角色設置
   - 返回有效和無效的數據條目

### 2. 會員邀請接受/拒絕功能

1. **獲取邀請列表 API** (`GET /invitations`)
   - 獲取用戶收到的所有有效協會邀請
   - 過濾過期邀請，並加載關聯的協會信息

2. **回應邀請 API** (`POST /invitations/respond`)
   - 接受或拒絕協會邀請
   - 如果接受，創建關聯的會員記錄
   - 無論接受或拒絕，都從邀請列表中移除

### 3. 會員狀態管理功能

1. **獲取會員列表 API** (`GET /associations/:id/members`)
   - 獲取協會所有會員
   - 支持過濾活躍/非活躍會員

2. **更新會員狀態 API** (`PATCH /associations/members/:id/status`)
   - 啟用或停用會員
   - 支持 ACTIVE、INACTIVE 和 PENDING 狀態

3. **移除會員 API** (`DELETE /associations/members/:id`)
   - 從協會中移除會員

4. **更新會員角色 API** (`PATCH /associations/members/:id/role`)
   - 更新會員的角色（ADMIN/MEMBER）

5. **更新目錄可見性 API** (`PATCH /associations/members/:id/visibility`)
   - 控制會員是否在協會目錄中顯示

6. **獲取用戶協會 API** (`GET /my-associations`)
   - 獲取當前用戶加入的所有協會

## 數據模型設計

1. **協會邀請存儲**
   - 使用 User 模型的 meta 欄位存儲邀請信息
   - 邀請包含令牌、協會ID、角色和過期時間
   - 提供安全的邀請接受機制

2. **關聯會員模型**
   - 使用 AssociationMember 模型管理會員與協會的關係
   - 跟踪會員角色、會員資格狀態和目錄顯示選項
   - 保存相關元數據，如邀請和接受時間

## 下一步計劃

### 已完成:
- ✅ 批量邀請功能
- ✅ 會員邀請接受/拒絕功能 
- ✅ 會員啟用功能

### 待實現:
1. **Profile徽章顯示API**
   - 在用戶的個人檔案中顯示協會徽章
   - 協會徽章設計和存儲

2. **更新Profile顯示設置**
   - 允許用戶選擇在個人檔案中顯示哪些協會徽章
   - 設置徽章顯示順序

3. **獲取協會徽章選項**
   - 獲取用戶可以顯示的所有協會徽章
   - 包括徽章設計和顯示選項

4. **協會關係管理API**
   - 管理用戶與多個協會的關係
   - 設置默認協會

5. **用戶獲取自己的協會關係**
   - 查看所有關聯協會及其狀態
   - 管理協會會員資格設置

6. **設置默認顯示選項**
   - 配置在不同上下文中的默認協會顯示
   - 個性化協會徽章顯示設置 