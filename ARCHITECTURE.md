# NFC LinkCard Express 架構文檔

## 專案概述
NFC LinkCard Express 是一個基於 Express.js 和 TypeScript 的後端服務，提供 NFC 名片管理和分享功能。

## 技術棧
- **框架**: Express.js
- **語言**: TypeScript
- **數據庫**: PostgreSQL with Prisma ORM
- **認證**: JWT
- **文件存儲**: Vercel Blob Storage
- **郵件服務**: NodeMailer

## 目錄結構
```
src/
├── controllers/     # 控制器層，處理 HTTP 請求
├── services/        # 業務邏輯層
├── dtos/           # 數據傳輸對象
├── middlewares/    # 中間件
├── utils/          # 工具函數
├── types/          # TypeScript 類型定義
├── routes/         # 路由定義
├── lib/            # 第三方庫配置
└── storage/        # 存儲提供者實現
```

## 核心模塊

### 1. 認證模塊 (Auth)
- 用戶註冊
- 郵件驗證
- 登入/登出
- 密碼重設

### 2. 用戶模塊 (User)
- 用戶資料管理
- 頭像上傳
- 密碼修改

### 3. 檔案模塊 (Profile)
- 個人檔案管理
- 檔案封面上傳
- 默認檔案設置

### 4. 連結模塊 (Link)
- 連結管理
- 連結排序
- 連結分析

## 數據模型
主要的數據模型包括：
- User (用戶)
- Profile (檔案)
- Link (連結)
- Analytics (分析數據)

## 安全性考慮
1. 所有密碼使用 bcrypt 加密
2. JWT 用於身份驗證
3. 輸入驗證使用 class-validator
4. CORS 保護
5. 限流保護

## API 設計原則
1. RESTful 設計
2. 統一的響應格式
3. 適當的 HTTP 狀態碼
4. 詳細的錯誤信息

## 擴展性考慮
1. 模塊化設計
2. 依賴注入
3. 介面抽象
4. 可配置的環境變量 