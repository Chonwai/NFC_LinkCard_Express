import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import routes from './routes';
import profileRoutes from './routes/profiles';
import linkRoutes from './routes/links';
import associationRoutes from './association/routes';
import paymentRoutes from './payment/routes';

const app = express();

app.use(
    cors({
        // origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://127.0.0.1:3005', // 允許的來源
        origin: [
            'http://127.0.0.1:3005',
            'http://localhost:3005',
            'http://127.0.0.1:3020',
            'http://localhost:3020',
            'http://127.0.0.1:4000',
            'http://localhost:4000',
            'https://link-card-frontend.vercel.app',
            'http://link-card-frontend.vercel.app',
            'https://nfc-link-card-next-js.vercel.app',
            'http://nfc-link-card-next-js.vercel.app',
            'https://link-card.xyz',
            'http://link-card.xyz',
            'https://linkcard.xyz',
            'http://linkcard.xyz',
            'https://nfc-link-card-express.vercel.app',
            'http://nfc-link-card-express.vercel.app',
            'https://staging.link-card.xyz',
            'http://staging.link-card.xyz',
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Authorization'],
        credentials: true,
        maxAge: 86400,
    }),
);

// Stripe Webhook 特定處理 - 必須在 express.json() 之前
app.use('/api/payment/purchase-orders/webhook', express.raw({ type: 'application/json' }));

// 配置請求體解析（一般 API）
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 註冊路由
app.use('/api', routes);
app.use('/profiles', profileRoutes);
app.use('/links', linkRoutes);
app.use('/api/association', associationRoutes);
app.use('/api/payment', paymentRoutes);

app.listen(3020, () => {
    console.log('Server is running on port 3020');
});

export default app;
