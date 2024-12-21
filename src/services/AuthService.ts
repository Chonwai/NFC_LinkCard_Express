import prisma from '../lib/prisma';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';
import { HttpException } from '../utils/HttpException';
import { generateSlug } from '../utils/slugGenerator';

export class AuthService {
    async register(registerDto: RegisterDto) {
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email: registerDto.email }, { username: registerDto.username }],
            },
        });

        if (existingUser) {
            throw new HttpException(400, '用戶已存在');
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

    async login(loginDto: LoginDto) {
        const user = await prisma.user.findUnique({
            where: { email: loginDto.email },
        });

        if (!user) {
            throw new HttpException(401, '用戶不存在');
        }

        const isValidPassword = await prisma.user.validatePassword(
            loginDto.password,
            user.password,
        );

        if (!isValidPassword) {
            throw new HttpException(401, '密碼錯誤');
        }

        const { password, ...userWithoutPassword } = user;
        const token = prisma.user.generateToken(user);

        return { user: userWithoutPassword, token };
    }
}
