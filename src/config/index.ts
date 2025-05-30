import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

export const Config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || '3020',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',

    // Email configuration (example)
    email: {
        host: process.env.EMAIL_HOST || 'smtp.example.com',
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER || 'user@example.com',
            pass: process.env.EMAIL_PASS || 'password',
        },
        defaultFrom: process.env.EMAIL_DEFAULT_FROM || '"LinkCard Support" <noreply@linkcard.com>',
    },

    // Frontend URL (crucial for generating correct links in emails)
    frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:3000',

    // Database URL (Prisma typically reads this from .env directly, but good to have a central reference point)
    databaseUrl: process.env.DATABASE_URL,

    // Vercel Blob Storage Token (if used)
    vercelBlobToken: process.env.BLOB_READ_WRITE_TOKEN,
};
