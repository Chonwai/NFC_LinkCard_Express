import { SnakeNamingStrategy } from "typeorm-naming-strategies";

const { DataSource } = require('typeorm');
require('dotenv').config();


const AppDataSource = new DataSource({
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
});

module.exports = AppDataSource;