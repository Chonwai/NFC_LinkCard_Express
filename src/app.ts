import express from 'express';
import cors from 'cors';
import { AppDataSource } from './config/data-source';
import routes from './routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);

AppDataSource.initialize()
    .then(() => {
        console.log('Database connected');
    })
    .catch((error) => console.log(error));

app.listen(3020, () => {
    console.log('Server is running on port 3020');
});

export default app;
