import { parse } from 'csv-parse/sync';

/**
 * 驗證電子郵件格式
 * @param email 電子郵件
 * @returns 是否有效
 */
function isValidEmail(email: string): boolean {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
}

/**
 * 驗證角色是否有效
 * @param role 角色
 * @returns 是否有效
 */
function isValidRole(role: string): boolean {
    return ['ADMIN', 'MEMBER'].includes(role);
}

/**
 * 解析CSV數據
 * @param csvData CSV字符串數據
 * @returns 解析結果
 */
export async function parseCsv(csvData: string) {
    try {
        // 解析CSV數據
        const records = parse(csvData, {
            columns: true,
            skip_empty_lines: true,
        });

        const validEntries: any[] = [];
        const invalidEntries: any[] = [];

        // 驗證每一行數據
        records.forEach((row: any) => {
            // 基本驗證：檢查email字段
            if (!row.email || !isValidEmail(row.email)) {
                invalidEntries.push({
                    data: row,
                    errors: ['無效的電子郵件格式'],
                });
            } else {
                validEntries.push({
                    email: row.email,
                    name: row.name || '',
                    role: isValidRole(row.role) ? row.role : 'MEMBER',
                });
            }
        });

        return {
            validEntries,
            invalidEntries,
            total: records.length,
            valid: validEntries.length,
            invalid: invalidEntries.length,
        };
    } catch (error) {
        throw new Error(`CSV解析錯誤: ${(error as Error).message}`);
    }
}
