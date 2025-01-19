import prisma from '../lib/prisma';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';
import { generateSlug } from '../utils/slugGenerator';
import { Response } from 'express';
import { ErrorHandler } from '../utils/ErrorHandler';
import { Service } from 'typedi';
import crypto from 'crypto';
import { EmailService } from './EmailService';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

interface RegisterResult {
    user: {
        id: string;
        username: string;
        email: string;
        display_name: string | null;
        avatar: string | null;
        bio: string | null;
        is_verified: boolean;
        created_at: Date;
        updated_at: Date;
    };
    token: string;
}

@Service()
export class AuthService {
    constructor(private emailService: EmailService) {}

    generateToken(user: { id: string }): string {
        return jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'your-secret-key', {
            expiresIn: '24h',
        });
    }

    async register(registerDto: RegisterDto, res: Response): Promise<RegisterResult | Response> {
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email: registerDto.email }, { username: registerDto.username }],
            },
        });

        if (existingUser) {
            return ErrorHandler.badRequest(res, '用戶已存在', 'USER_EXISTS');
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');

        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.createWithHashedPassword({
                ...registerDto,
                verification_token: verificationToken,
                is_verified: false,
                verified_at: null,
            });

            const defaultProfile = await tx.profile.create({
                data: {
                    name: user.username,
                    slug: await generateSlug(user.username),
                    user_id: user.id,
                    is_default: true,
                    description: `${user.username}'s default profile`,
                },
            });

            // 發送驗證郵件
            await this.emailService.sendVerificationEmail(user.email, verificationToken);

            const token = this.generateToken(user);

            return {
                user,
                profile: defaultProfile,
                token,
            };
        });
    }

    async login(loginDto: LoginDto, res: Response) {
        const user = await prisma.user.findUnique({
            where: { email: loginDto.email },
        });

        if (!user) {
            return ErrorHandler.unauthorized(res, '用戶不存在', 'USER_NOT_FOUND');
        }

        const isValidPassword = await prisma.user.validatePassword(
            loginDto.password,
            user.password,
        );

        if (!isValidPassword) {
            return ErrorHandler.unauthorized(res, '密碼錯誤', 'INVALID_PASSWORD');
        }

        const { password, ...userWithoutPassword } = user;
        const token = this.generateToken(user);

        return { user: userWithoutPassword, token };
    }
}
