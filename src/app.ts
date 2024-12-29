import express from 'express';
import cors from 'cors';
import routes from './routes';
import profileRoutes from './routes/profiles';
import linkRoutes from './routes/links';

const app = express();

app.use(
    cors({
        // origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://127.0.0.1:3005', // 允許的來源
        origin: [
            'http://127.0.0.1:3005',
            'http://localhost:3005',
            'https://link-card-frontend.vercel.app',
            'http://link-card-frontend.vercel.app',
            'link-card-frontend.vercel.app',
            'https://nfc-link-card-express.vercel.app',
            'http://nfc-link-card-express.vercel.app',
            'nfc-link-card-express.vercel.app',
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Authorization'],
        credentials: true,
        maxAge: 86400,
    }),
);
app.use(express.json());

app.use('/api/profiles', profileRoutes);
app.use('/api/links', linkRoutes);
app.use('/api', routes);

app.listen(3020, () => {
    console.log('Server is running on port 3020');
});

export default app;
