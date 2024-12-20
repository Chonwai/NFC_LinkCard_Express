import { DataSource } from 'typeorm';
import { databaseConfig } from './database';

export const AppDataSource = new DataSource(databaseConfig);
