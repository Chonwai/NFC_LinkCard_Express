import { DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const prodConfig: DataSourceOptions = {
    type: 'postgres',
    url: process.env.POSTGRES_PRISMA_URL,
    ssl: {
        rejectUnauthorized: false,
    },
    entities: ['src/models/*.ts'],
    migrations: ['src/migrations/**/*.ts'],
    synchronize: false,
    logging: ['error'],
    namingStrategy: new SnakeNamingStrategy(),
};

const devConfig: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: ['src/models/*.ts'],
    migrations: ['src/migrations/**/*.ts'],
    synchronize: false,
    logging: ['query', 'error', 'schema', 'warn', 'info', 'log'],
    namingStrategy: new SnakeNamingStrategy(),
};

export const databaseConfig: DataSourceOptions = isProd ? prodConfig : devConfig;
