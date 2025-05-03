# NFC LinkCard Express

簡潔的數字名片管理系統，讓分享聯繫資訊變得簡單而現代化。

## 💡 項目概述

NFC LinkCard Express 是一個基於 Express.js 和 TypeScript 的 RESTful API 服務，讓使用者能夠創建和管理數字名片，並通過 NFC 或網頁鏈接輕鬆分享。

![示例圖片或標誌](./path/to/screenshot.png)

## 🚀 快速開始

### 前置需求

- Node.js 18+
- PostgreSQL 15+
- npm 或 yarn

### 安裝與運行

```bash
# 克隆項目
git clone https://github.com/yourusername/nfc-linkcard-express.git
cd nfc-linkcard-express

# 安裝依賴
npm install

# 配置環境變量
cp .env.example .env
# 編輯 .env 文件設置必要的變量

# 運行數據庫遷移
npx prisma migrate dev

# 啟動開發服務器
npm run dev
```

## 📚 文檔

- [架構設計](./docs/ARCHITECTURE.md) - 詳細的系統架構與設計模式
- [API 文檔](./docs/API.md) - API 端點與使用說明
- [開發指南](./docs/DEVELOPMENT.md) - 貢獻代碼與開發規範

## 🔧 主要功能

- 用戶註冊與身份驗證
- 多檔案管理
- 社交媒體與自定義鏈接
- 數據分析
- 潛在客戶收集

## 📄 許可證

MIT 