import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { ApiResponse } from '../utils/ApiResponse';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';
import { User } from '../models/User';

export class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    register = async (req: Request, res: Response) => {
        try {
            const registerDto = plainToClass(RegisterDto, req.body);
            const errors = await validate(registerDto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            const { user } = await this.authService.register(registerDto);
            const token = this.authService.generateToken(user as User);

            return ApiResponse.success(res, { user }, 201, { Authorization: `Bearer ${token}` });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                error.message,
                'REGISTER_ERROR',
                null,
                error.status || 500,
            );
        }
    };

    login = async (req: Request, res: Response) => {
        try {
            const loginDto = plainToClass(LoginDto, req.body);
            const errors = await validate(loginDto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            const { user } = await this.authService.login(loginDto);
            const token = this.authService.generateToken(user as User);

            return ApiResponse.success(res, { user }, 200, { Authorization: `Bearer ${token}` });
        } catch (error: any) {
            return ApiResponse.error(res, error.message, 'LOGIN_ERROR', null, error.status || 500);
        }
    };
}
