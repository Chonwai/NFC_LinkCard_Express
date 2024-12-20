import express from 'express';
import cors from 'cors';
import { AppDataSource } from './config/data-source';
import routes from './routes';

const app = express();

app.use(cors());
app.use(express.json());

// 使用統一的路由前綴
app.use('/api', routes);

// 資料庫連接
AppDataSource.initialize()
    .then(() => {
        console.log('Database connected');
    })
    .catch((error) => console.log(error));

app.listen(3010, () => {
    console.log('Server is running on port 3010');
});

export default app;
