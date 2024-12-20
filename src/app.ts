import express from 'express';
import cors from 'cors';
import { createConnection } from 'typeorm';
import linkRoutes from './routes/links';

const app = express();

app.use(cors());
app.use(express.json());

// 路由
app.use('/api/links', linkRoutes);

// 資料庫連接
createConnection()
    .then(() => {
        console.log('Database connected');
    })
    .catch((error) => console.log(error));

export default app;
