import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.config';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
    log: ['query', 'error', 'warn'],
}).$extends({
    model: {
        user: {
            async hashPassword(password: string) {
                return bcrypt.hash(password, 10);
            },

            async validatePassword(plainPassword: string, hashedPassword: string) {
                return bcrypt.compare(plainPassword, hashedPassword);
            },

            async createWithHashedPassword(data: Prisma.UserCreateInput) {
                const hashedPassword = await this.hashPassword(data.password);
                return prisma.user.create({
                    data: {
                        ...data,
                        password: hashedPassword,
                    },
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        display_name: true,
                        avatar: true,
                        bio: true,
                        is_verified: true,
                        created_at: true,
                        updated_at: true,
                    },
                });
            },

            generateToken(user: { id: string; email: string }) {
                return jwt.sign({ id: user.id, email: user.email }, jwtConfig.secret, {
                    expiresIn: jwtConfig.expiresIn,
                });
            },
        },
    },
});

export default prisma;
