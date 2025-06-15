import { Request, Response, NextFunction } from 'express';

/**
 * Stripe Webhook 中間件
 * 用於處理 Stripe Webhook 的原始請求體
 * Stripe 需要原始請求體來驗證 Webhook 簽名
 */
export const stripeWebhookMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl === '/api/payment/purchase-orders/webhook') {
        let data = '';
        req.setEncoding('utf8');

        req.on('data', (chunk) => {
            data += chunk;
        });

        req.on('end', () => {
            req.body = Buffer.from(data, 'utf8');
            next();
        });
    } else {
        next();
    }
};
