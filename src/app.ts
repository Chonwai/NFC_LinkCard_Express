import express from 'express';
import cors from 'cors';
import routes from './routes';
import profileRoutes from './routes/profiles';
import linkRoutes from './routes/links';

const app = express();

app.use(
    cors({
        exposedHeaders: ['Authorization'],
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
