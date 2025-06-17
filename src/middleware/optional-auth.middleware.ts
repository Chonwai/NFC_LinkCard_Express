import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * 可選認證中間件
 * 如果有認證頭則嘗試認證，沒有則允許繼續（當作未認證處理）
 * 這樣同一個端點可以服務認證和未認證用戶
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // 沒有認證頭，當作未認證用戶繼續
        req.user = undefined;
        return next();
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        req.user = decoded;
        next();
    } catch (error) {
        // 認證失敗，但不阻止請求（當作未認證處理）
        req.user = undefined;
        next();
    }
};
