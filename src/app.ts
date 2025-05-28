import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import routes from './routes';
import profileRoutes from './routes/profiles';
import linkRoutes from './routes/links';
import associationRoutes from './association/routes';
import propertyRoutes from './property/routes/index';

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
            'link-card-frontend.vercel.app',
            'https://nfc-link-card-express.vercel.app',
            'http://nfc-link-card-express.vercel.app',
            'nfc-link-card-express.vercel.app',
            'https://nfc-link-card-next-js.vercel.app',
            'http://nfc-link-card-next-js.vercel.app',
            'nfc-link-card-next-js.vercel.app',
            'https://link-card.xyz',
            'http://link-card.xyz',
            'link-card.xyz',
            'https://www.link-card.xyz',
            'http://www.link-card.xyz',
            'www.link-card.xyz',
            'https://staging.link-card.xyz',
            'http://staging.link-card.xyz',
            'staging.link-card.xyz',
            'https://prod-link-card-frontend.vercel.app',
            'http://prod-link-card-frontend.vercel.app',
            'prod-link-card-frontend.vercel.app',
            'https://staging-link-card-frontend.vercel.app',
            'http://staging-link-card-frontend.vercel.app',
            'staging-link-card-frontend.vercel.app',
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Authorization'],
        credentials: true,
        maxAge: 86400,
    }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/profiles', profileRoutes);
app.use('/api/links', linkRoutes);
app.use('/api', routes);
app.use('/api/association', associationRoutes);
app.use('/api/property', propertyRoutes);

app.listen(3020, () => {
    console.log('Server is running on port 3020');
});

export default app;
