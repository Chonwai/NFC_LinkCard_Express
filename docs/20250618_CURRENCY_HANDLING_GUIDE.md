# 貨幣處理統一規範指南（File Name: 20250618_CURRENCY_HANDLING_GUIDE.md）

## 概述

本文檔定義了 NFC LinkCard Express 項目中前後端統一的貨幣處理標準，確保數據一致性、避免精度問題，並符合 Stripe 等支付提供商的最佳實踐。

## 核心原則

### 1. 三層轉換模式（業界標準）
```
數據庫存儲 ↔ 業務邏輯 ↔ 支付 API
   10.50   ↔   10.50   ↔   1050
  (Decimal)   (Number)   (Cents)
```

### 2. 統一變量命名約定
- **包含單位**：`amountInHKD`, `priceInCents`, `totalInDollars`
- **避免歧義**：永遠不要使用 `amount`, `price` 等模糊命名
- **明確意圖**：讓代碼自解釋，減少錯誤

## 後端規範（已實現）

### 數據庫設計 ✅
```sql
-- 使用 Decimal(10, 2) 存儲實際金額
price DECIMAL(10, 2) NOT NULL -- 如 10.50, 299.99
```

### API 轉換 ✅
```typescript
// 發送給 Stripe：轉換為分
unit_amount: Math.round(data.amount * 100) // 10.50 → 1050

// DTO 驗證
@IsNumber({ maxDecimalPlaces: 2 })
@Transform(({ value }) => parseFloat(value))
price: number; // 最多2位小數
```

### 統一工具類 ✅
```typescript
// src/utils/currency.util.ts
CurrencyUtil.convertToCents(10.50)     // 返回 1050
CurrencyUtil.convertFromCents(1050)    // 返回 10.50
CurrencyUtil.formatCurrency(10.50)     // 返回 "HK$10.50"
```

## 前端規範（需實現）

### 1. 接收 API 數據

**正確做法：**
```typescript
// API 響應中的金額字段
interface PricingPlanResponse {
  id: string;
  name: string;
  priceInHKD: string;        // "10.50" (Prisma Decimal 返回字符串)
  currency: string;          // "HKD"
  // ... 其他字段
}

// 接收後立即轉換為數值
const priceAsNumber = parseFloat(response.priceInHKD);
```

**❌ 錯誤做法：**
```typescript
// 不要使用模糊的字段名
interface BadResponse {
  price: any;     // 不明確是什麼單位
  amount: number; // 不知道是分還是元
}
```

### 2. 顯示給用戶

**使用統一格式化函數：**
```typescript
// utils/currency.ts
export const formatCurrency = (
  amountInHKD: number,
  currency: string = 'HKD',
  locale: string = 'zh-HK'
): string => {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amountInHKD);
};

// 使用示例
const displayPrice = formatCurrency(10.50); // "HK$10.50"
const displayPriceUSD = formatCurrency(10.50, 'USD', 'en-US'); // "$10.50"
```

### 3. 用戶輸入處理

**創建貨幣輸入組件：**
```typescript
// components/CurrencyInput.tsx
interface CurrencyInputProps {
  value: number; // 總是以 HKD 為單位
  onChange: (valueInHKD: number) => void;
  currency?: string;
  placeholder?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  currency = 'HKD',
  placeholder = '0.00'
}) => {
  const [inputValue, setInputValue] = useState(value.toFixed(2));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // 只允許數字和一個小數點
    const sanitized = rawValue.replace(/[^0-9.]/g, '');
    
    // 確保最多2位小數
    const parts = sanitized.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    
    setInputValue(sanitized);
    
    // 轉換為數值並回調
    const numericValue = parseFloat(sanitized) || 0;
    onChange(numericValue);
  };

  return (
    <div className="currency-input">
      <span className="currency-symbol">HK$</span>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        pattern="[0-9]+(\.[0-9]{1,2})?"
      />
    </div>
  );
};
```

### 4. 發送數據到後端

**準備 API 請求：**
```typescript
// 創建定價方案
interface CreatePricingPlanRequest {
  name: string;
  displayName: string;
  priceInHKD: number;  // 明確單位
  currency: string;
  billingCycle: string;
}

const createPricingPlan = async (data: CreatePricingPlanRequest) => {
  // 驗證金額格式
  if (!isValidCurrencyAmount(data.priceInHKD)) {
    throw new Error('Invalid currency amount');
  }

  return api.post('/api/payment/pricing-plans', {
    ...data,
    price: data.priceInHKD // 後端期望的字段名
  });
};

// 驗證函數
const isValidCurrencyAmount = (amount: number): boolean => {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    return false;
  }
  
  // 檢查是否超過2位小數
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  return decimalPlaces <= 2;
};
```

### 5. 處理支付流程

**Stripe Checkout 集成：**
```typescript
const handleCreateCheckout = async (pricingPlanId: string) => {
  try {
    // 後端會自動處理 HKD → 分的轉換
    const response = await api.post('/api/payment/purchase-orders', {
      pricingPlanId,
      // 後端會從 pricing plan 獲取價格並轉換為分
    });

    // 重定向到 Stripe Checkout
    window.location.href = response.data.checkoutUrl;
  } catch (error) {
    console.error('Payment creation failed:', error);
  }
};
```

## 前端工具函數庫

創建 `src/utils/currency.ts`：

```typescript
/**
 * 前端貨幣處理工具函數
 */

export class FrontendCurrencyUtil {
  /**
   * 格式化貨幣顯示
   */
  static formatCurrency(
    amountInHKD: number,
    currency: string = 'HKD',
    locale: string = 'zh-HK'
  ): string {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(amountInHKD);
  }

  /**
   * 驗證貨幣金額格式
   */
  static isValidAmount(amount: number): boolean {
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      return false;
    }

    // 檢查是否超過2位小數
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    return decimalPlaces <= 2;
  }

  /**
   * 安全解析字符串金額（來自 API）
   */
  static parseAmount(amountString: string): number {
    const parsed = parseFloat(amountString);
    if (isNaN(parsed)) {
      throw new Error(`Invalid amount string: ${amountString}`);
    }
    return parsed;
  }

  /**
   * 比較兩個金額是否相等（避免浮點數精度問題）
   */
  static areAmountsEqual(amount1: number, amount2: number): boolean {
    return Math.abs(amount1 - amount2) < 0.01;
  }

  /**
   * 格式化金額為輸入框顯示
   */
  static formatForInput(amount: number): string {
    return amount.toFixed(2);
  }
}
```

## 測試示例

### 前端單元測試
```typescript
// __tests__/currency.test.ts
import { FrontendCurrencyUtil } from '../utils/currency';

describe('FrontendCurrencyUtil', () => {
  test('格式化 HKD 貨幣', () => {
    expect(FrontendCurrencyUtil.formatCurrency(10.50))
      .toBe('HK$10.50');
  });

  test('驗證有效金額', () => {
    expect(FrontendCurrencyUtil.isValidAmount(10.50)).toBe(true);
    expect(FrontendCurrencyUtil.isValidAmount(10.555)).toBe(false);
    expect(FrontendCurrencyUtil.isValidAmount(-1)).toBe(false);
  });

  test('解析 API 金額字符串', () => {
    expect(FrontendCurrencyUtil.parseAmount('10.50')).toBe(10.50);
    expect(() => FrontendCurrencyUtil.parseAmount('invalid'))
      .toThrow('Invalid amount string');
  });
});
```

## 常見錯誤和避免方法

### ❌ 錯誤做法

```typescript
// 1. 模糊的變量命名
let price = 1050; // 不知道是分還是元

// 2. 直接使用浮點數計算
let total = 10.1 + 0.2; // 結果：10.299999999999999

// 3. 不一致的格式化
let display1 = `$${amount}`;
let display2 = amount.toFixed(2);

// 4. 沒有驗證輸入
setPrice(userInput); // 可能是 "abc" 或負數
```

### ✅ 正確做法

```typescript
// 1. 明確的變量命名
let priceInHKD = 10.50;
let priceInCents = 1050;

// 2. 使用工具函數處理
let totalInHKD = FrontendCurrencyUtil.addAmounts(10.10, 0.20);

// 3. 統一格式化
let display = FrontendCurrencyUtil.formatCurrency(priceInHKD);

// 4. 驗證輸入
if (FrontendCurrencyUtil.isValidAmount(userInput)) {
  setPriceInHKD(userInput);
}
```

## 團隊規範檢查清單

### 前端代碼審查要點
- [ ] 所有貨幣相關變量都包含單位（`InHKD`, `InCents`）
- [ ] 使用統一的格式化函數 `FrontendCurrencyUtil.formatCurrency()`
- [ ] 用戶輸入已驗證格式和範圍
- [ ] API 響應中的 Decimal 字符串已正確解析
- [ ] 沒有直接的浮點數貨幣計算

### 後端代碼審查要點
- [ ] 數據庫使用 `Decimal(10, 2)` 存儲
- [ ] Stripe API 調用使用 `CurrencyUtil.convertToCents()`
- [ ] 變量命名包含單位
- [ ] DTO 驗證最多2位小數

## 總結

這個統一規範確保了：
1. **數據一致性**：前後端使用相同的轉換邏輯
2. **避免錯誤**：明確的命名約定減少混淆
3. **用戶體驗**：統一的格式化顯示
4. **可維護性**：集中的工具函數便於修改
5. **符合標準**：遵循 Stripe 和業界最佳實踐

所有團隊成員都應該遵循這個規範，確保項目的貨幣處理安全可靠。 