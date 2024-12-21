import prisma from '../lib/prisma';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';
import { HttpException } from '../utils/HttpException';

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

        const user = await prisma.user.createWithHashedPassword(registerDto);
        const token = prisma.user.generateToken(user);

        return { user, token };
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
