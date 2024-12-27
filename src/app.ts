import express from 'express';
import cors from 'cors';
import routes from './routes';
import profileRoutes from './routes/profiles';
import linkRoutes from './routes/links';

const app = express();

app.use(
    cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://127.0.0.1:3005',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Authorization'],
        credentials: true,
        maxAge: 86400
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
