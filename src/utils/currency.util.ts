/**
 * 貨幣轉換工具類
 * 統一處理所有貨幣相關的轉換邏輯，避免在代碼中散布轉換邏輯
 */

export class CurrencyUtil {
    /**
     * 將金額（如 10.50）轉換為分（如 1050）
     * 用於發送給 Stripe 等支付提供商
     */
    static convertToCents(amountInDollars: number): number {
        if (typeof amountInDollars !== 'number' || isNaN(amountInDollars)) {
            throw new Error('Invalid amount provided for conversion to cents');
        }

        return Math.round(amountInDollars * 100);
    }

    /**
     * 將分（如 1050）轉換為金額（如 10.50）
     * 用於從支付提供商接收數據後的顯示
     */
    static convertFromCents(amountInCents: number): number {
        if (typeof amountInCents !== 'number' || isNaN(amountInCents)) {
            throw new Error('Invalid cents amount provided for conversion');
        }

        return amountInCents / 100;
    }

    /**
     * 格式化金額顯示
     * 支持不同幣種和地區格式
     */
    static formatCurrency(
        amount: number,
        currency: string = 'HKD',
        locale: string = 'zh-HK',
    ): string {
        const formatter = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        return formatter.format(amount);
    }

    /**
     * 驗證金額格式（最多2位小數）
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
     * 安全的金額加法（避免 JavaScript 浮點數問題）
     */
    static addAmounts(...amounts: number[]): number {
        const totalInCents = amounts.reduce((sum, amount) => {
            return sum + this.convertToCents(amount);
        }, 0);

        return this.convertFromCents(totalInCents);
    }

    /**
     * 安全的金額乘法
     */
    static multiplyAmount(amount: number, multiplier: number): number {
        const amountInCents = this.convertToCents(amount);
        const result = Math.round(amountInCents * multiplier);
        return this.convertFromCents(result);
    }
}
