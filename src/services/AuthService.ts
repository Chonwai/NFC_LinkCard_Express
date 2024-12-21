import { User } from '../models/User';
import { AppDataSource } from '../config/data-source';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';
import * as jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.config';
import { HttpException } from '../utils/HttpException';

export class AuthService {
    private userRepository = AppDataSource.getRepository(User);

    async register(registerDto: RegisterDto): Promise<{ user: User; token: string }> {
        const existingUser = await this.userRepository.findOne({
            where: [{ email: registerDto.email }, { username: registerDto.username }],
        });

        if (existingUser) {
            throw new HttpException(400, '用戶已存在');
        }

        const user = this.userRepository.create(registerDto);
        await this.userRepository.save(user);

        const token = this.generateToken(user);
        return { user, token };
    }

    async login(loginDto: LoginDto): Promise<{ user: User; token: string }> {
        const user = await this.userRepository.findOne({
            where: { email: loginDto.email },
        });

        if (!user) {
            throw new HttpException(401, '用戶不存在');
        }

        const isValidPassword = await user.validatePassword(loginDto.password);
        if (!isValidPassword) {
            throw new HttpException(401, '密碼錯誤');
        }

        const token = this.generateToken(user);
        return { user, token };
    }

    private generateToken(user: User): string {
        return jwt.sign({ id: user.id, email: user.email }, jwtConfig.secret, {
            expiresIn: jwtConfig.expiresIn,
        });
    }
}
