# LinkCard 系統架構設計文檔（藍圖）

## 目錄
- [系統概述](#系統概述)
- [架構演進路線](#架構演進路線)
- [漸進式重構方案](#漸進式重構方案)
- [多版本架構設計](#多版本架構設計)
- [技術實現細節](#技術實現細節)
- [部署與擴展](#部署與擴展)

## 系統概述

### 系統目標
LinkCard 是一個多版本 NFC 數位名片系統，包含：
- 個人版（Personal）
- 協會版（Association）
- 企業版（Business）

### 核心特點
- 統一用戶系統
- 模塊化設計
- 可擴展架構
- 版本特定功能

## 架構演進路線

### 第一階段：模塊化單體架構
```
NFC_LinkCard_Express
├── src/
│   ├── common/           # 共享代碼
│   ├── core/            # 核心功能
│   ├── personal/        # 個人版
│   ├── association/     # 協會版
│   └── business/        # 企業版
```

### 第二階段：微服務架構
```
LinkCard-System
├── identity-service/     # 身份認證服務
├── core-api/            # 核心 API 服務
├── personal-api/        # 個人版 API
├── association-api/     # 協會版 API
└── business-api/        # 企業版 API
```

## 漸進式重構方案

### 第一階段：最小侵入性調整
1. 保持現有結構
2. 添加新模塊
3. 逐步遷移共享代碼

#### 目錄結構調整
```
NFC_LinkCard_Express
├── src/
│   ├── common/           # 新增：共享代碼
│   │   ├── middleware/   # 中間件
│   │   ├── utils/       # 工具函數
│   │   └── types/       # 類型定義
│   ├── core/            # 新增：核心功能
│   │   ├── auth/       # 認證相關
│   │   └── user/       # 用戶相關
│   ├── personal/       # 現有代碼
│   ├── association/    # 新增：協會版
│   └── business/       # 預留：企業版
```

#### 路由調整
```typescript
// app.ts
import express from 'express';
import personalRoutes from './src/personal/routes';
import associationRoutes from './src/association/routes';

const app = express();

// 現有路由保持不變
app.use('/api/personal', personalRoutes);

// 新增協會版路由
app.use('/api/association', associationRoutes);

// 預留企業版路由
// app.use('/api/business', businessRoutes);
```

### 第二階段：共享代碼遷移
1. 識別共享代碼
2. 創建共享模塊
3. 更新引用

#### 共享代碼示例
```typescript
// src/common/middleware/auth.middleware.ts
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // 統一的認證邏輯
};

// src/common/utils/response.util.ts
export class ApiResponse {
  // 統一的響應格式
}
```

### 第三階段：完整模塊化
1. 重構目錄結構
2. 更新依賴關係
3. 完善文檔

## 多版本架構設計

### 數據模型設計

#### 共享模型
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String
  role          UserRole  @default(PERSONAL)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum UserRole {
  PERSONAL
  ASSOCIATION
  BUSINESS
}
```

#### 版本特定模型
```prisma
model Association {
  id            String    @id @default(uuid())
  name          String
  description   String?
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id])
  members       AssociationMember[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model AssociationMember {
  id            String    @id @default(uuid())
  associationId String
  association   Association @relation(fields: [associationId], references: [id])
  userId        String
  role          MemberRole @default(MEMBER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### API 設計

#### 路由結構
```typescript
// 協會版路由
router.post('/associations', createAssociation);
router.get('/associations/:id', getAssociation);
router.put('/associations/:id', updateAssociation);
router.delete('/associations/:id', deleteAssociation);

// 成員管理
router.post('/associations/:id/members', addMember);
router.delete('/associations/:id/members/:memberId', removeMember);
```

#### 控制器示例
```typescript
export class AssociationController {
  constructor(private associationService: AssociationService) {}

  async createAssociation(req: Request, res: Response) {
    const dto = CreateAssociationDto.fromRequest(req);
    const association = await this.associationService.create(dto);
    return ApiResponse.success(association);
  }
}
```

### 權限控制

#### 中間件設計
```typescript
export const checkRole = (roles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return ApiResponse.error('權限不足', 403);
    }
    next();
  };
};
```

#### 權限檢查示例
```typescript
// 協會版路由
router.post('/associations', 
  authMiddleware,
  checkRole([UserRole.ASSOCIATION]),
  createAssociation
);
```

## 技術實現細節

### 數據庫優化
```prisma
model Association {
  // ... 其他字段
  @@index([userId])
  @@index([createdAt])
}

model AssociationMember {
  // ... 其他字段
  @@unique([associationId, userId])
  @@index([associationId])
  @@index([userId])
}
```

### 緩存策略
```typescript
export class AssociationService {
  constructor(
    private cache: Cache,
    private repository: AssociationRepository
  ) {}

  async getAssociation(id: string) {
    const cacheKey = `association:${id}`;
    let association = await this.cache.get(cacheKey);
    
    if (!association) {
      association = await this.repository.findById(id);
      await this.cache.set(cacheKey, association, '1h');
    }
    
    return association;
  }
}
```

### 錯誤處理
```typescript
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code
      }
    });
  }
  // ... 其他錯誤處理
};
```

## 部署與擴展

### 部署策略
1. 使用 Docker 容器化
2. 實現藍綠部署
3. 配置自動擴展

### 監控方案
1. 性能監控
2. 錯誤追蹤
3. 用戶行為分析

### 擴展計劃
1. 功能模塊化
2. 服務解耦
3. 微服務轉型

## 注意事項

### 開發規範
1. 遵循 TypeScript 最佳實踐
2. 使用 ESLint 和 Prettier
3. 編寫單元測試和集成測試

### 安全考慮
1. 實現 RBAC 權限控制
2. 數據加密傳輸
3. 定期安全審計

### 性能優化
1. 實現數據庫索引
2. 使用緩存策略
3. 優化查詢性能

## 結論

本架構設計方案採用漸進式重構策略，確保系統穩定性的同時實現功能擴展。通過模塊化設計和清晰的版本劃分，為未來的功能擴展和性能優化提供了良好的基礎。 