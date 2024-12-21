import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { ApiResponse } from '../utils/ApiResponse';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';

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

            const result = await this.authService.register(registerDto);
            return ApiResponse.success(res, result, 201);
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

            const result = await this.authService.login(loginDto);
            return ApiResponse.success(res, result);
        } catch (error: any) {
            return ApiResponse.error(res, error.message, 'LOGIN_ERROR', null, error.status || 500);
        }
    };
}
