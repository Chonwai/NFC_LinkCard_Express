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

            const result: any = await this.authService.register(registerDto, res);
            if (!result.user) return; // 如果已經在 service 層返回了錯誤

            return ApiResponse.success(res, { user: result.user }, 201, {
                Authorization: `Bearer ${result.token}`,
            });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(res, '註冊失敗', 'REGISTER_ERROR', apiError.message, 500);
        }
    };

    login = async (req: Request, res: Response) => {
        try {
            const loginDto = plainToClass(LoginDto, req.body);
            const errors = await validate(loginDto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            const result: any = await this.authService.login(loginDto, res);
            if (!result.user) return; // 如果已經在 service 層返回了錯誤

            return ApiResponse.success(res, { user: result.user }, 200, {
                Authorization: `Bearer ${result.token}`,
            });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(res, '登入失敗', 'LOGIN_ERROR', apiError.message, 500);
        }
    };
}
