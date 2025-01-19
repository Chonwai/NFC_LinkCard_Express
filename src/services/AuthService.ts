import prisma from '../lib/prisma';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';
import { generateSlug } from '../utils/slugGenerator';
import { Response } from 'express';
import { ErrorHandler } from '../utils/ErrorHandler';
import { Service } from 'typedi';

@Service()
export class AuthService {
    async register(registerDto: RegisterDto, res: Response) {
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email: registerDto.email }, { username: registerDto.username }],
            },
        });

        if (existingUser) {
            return ErrorHandler.badRequest(res, '用戶已存在', 'USER_EXISTS');
        }

        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.createWithHashedPassword(registerDto);

            const defaultProfile = await tx.profile.create({
                data: {
                    name: user.username,
                    slug: await generateSlug(user.username),
                    user_id: user.id,
                    is_default: true,
                    description: `${user.username}'s default profile`,
                },
            });

            const token = prisma.user.generateToken(user);

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
        const token = prisma.user.generateToken(user);

        return { user: userWithoutPassword, token };
    }
}
