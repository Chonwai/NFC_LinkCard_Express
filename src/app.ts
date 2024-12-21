import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { AppDataSource } from './config/data-source';
import routes from './routes';

const app = express();

app.use(
    cors({
        exposedHeaders: ['Authorization'],
    }),
);
app.use(express.json());

app.use('/api', routes);

AppDataSource.initialize()
    .then(() => {
        console.log('Database connected successfully');
        console.log(
            'Entities loaded:',
            AppDataSource.entityMetadatas.map((e) => e.name),
        );
    })
    .catch((error) => {
        console.error('Error during Data Source initialization:', error);
    });

app.listen(3020, () => {
    console.log('Server is running on port 3020');
});

export default app;
