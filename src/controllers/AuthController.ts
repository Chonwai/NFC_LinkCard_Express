import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { ApiResponse } from '../utils/apiResponse';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';
import { ApiError } from '../types/error.types';

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

            const { user, token } = await this.authService.register(registerDto);

            return ApiResponse.success(res, { user }, 201, { Authorization: `Bearer ${token}` });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                apiError.message,
                'REGISTER_ERROR',
                null,
                apiError.status || 500,
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

            const { user, token } = await this.authService.login(loginDto);

            return ApiResponse.success(res, { user }, 200, { Authorization: `Bearer ${token}` });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                apiError.message,
                'LOGIN_ERROR',
                null,
                apiError.status || 500,
            );
        }
    };
}
