import { SnakeNamingStrategy } from "typeorm-naming-strategies";

const { DataSource } = require('typeorm');
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

const prodConfig = {
    type: 'postgres',
    url: process.env.POSTGRES_PRISMA_URL,
    ssl: {
        rejectUnauthorized: false
    },
    entities: ['src/models/*.ts'],
    migrations: ['src/migrations/**/*.ts'],
    synchronize: false,
    logging: ['error'],
    namingStrategy: new SnakeNamingStrategy(),
};

const devConfig = {
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

const AppDataSource = new DataSource(isProd ? prodConfig : devConfig);

module.exports = AppDataSource;