import { DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

export const databaseConfig: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: ['src/models/**/*.ts'],
    migrations: ['src/migrations/**/*.ts'],
    synchronize: false,
    logging: true,
};
