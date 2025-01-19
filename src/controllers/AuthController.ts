import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { ApiResponse } from '../utils/apiResponse';
import { plainToClass } from 'class-transformer';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from '../dtos/auth.dto';
import { ApiError } from '../types/error.types';
import { Service } from 'typedi';
import { EmailService } from '../services/EmailService';
import { UserService } from '../services/UserService';
import crypto from 'crypto';
import { validate } from 'class-validator';

@Service()
export class AuthController {
    constructor(
        private readonly emailService: EmailService,
        private readonly userService: UserService,
        private readonly authService: AuthService,
    ) {}

    register = async (req: Request, res: Response) => {
        try {
            const registerDto = plainToClass(RegisterDto, req.body);
            const errors = await validate(registerDto);

            if (errors.length > 0) {
                return ApiResponse.error(res, 'Validation error', 'VALIDATION_ERROR', errors, 400);
            }

            const result = await this.authService.register(registerDto, res);
            if ('user' in result) {
                return ApiResponse.success(
                    res,
                    {
                        message:
                            'Registration successful. Please check your email to verify your account.',
                    },
                    201,
                );
            }
            return result; // 如果是 Response 類型，直接返回
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                'Registration failed',
                'REGISTER_ERROR',
                apiError.message,
                500,
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

    forgotPassword = async (req: Request, res: Response) => {
        try {
            const forgotPasswordDto = plainToClass(ForgotPasswordDto, req.body);
            const errors = await validate(forgotPasswordDto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            const user = await this.userService.findByEmail(forgotPasswordDto.email);
            if (!user) {
                return ApiResponse.error(
                    res,
                    '找不到此電子郵件地址的用戶',
                    'USER_NOT_FOUND',
                    null,
                    404,
                );
            }

            // 生成重設密碼 token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetExpires = new Date(Date.now() + 3600000); // 1小時後過期

            try {
                // 更新用戶的重設密碼信息
                await this.userService.updateResetPasswordToken(user.id, resetToken, resetExpires);

                // 發送重設密碼郵件
                await this.emailService.sendResetPasswordEmail(forgotPasswordDto.email, resetToken);

                return ApiResponse.success(res, {
                    message: '重設密碼郵件已發送，請檢查您的電子郵件',
                });
            } catch (emailError) {
                // 如果發送郵件失敗，回滾 token
                await this.userService.updateResetPasswordToken(user.id, null as any, null as any);
                console.error('發送重設密碼郵件失敗:', emailError);

                return ApiResponse.error(
                    res,
                    '發送重設密碼郵件失敗，請稍後再試',
                    'EMAIL_SEND_ERROR',
                    null,
                    500,
                );
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            return ApiResponse.error(
                res,
                '處理忘記密碼請求時發生錯誤',
                'FORGOT_PASSWORD_ERROR',
                null,
                500,
            );
        }
    };

    resetPassword = async (req: Request, res: Response) => {
        try {
            const resetPasswordDto = plainToClass(ResetPasswordDto, req.body);
            console.log(resetPasswordDto);
            const errors = await validate(resetPasswordDto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            // 驗證 token 並查找用戶
            const user = await this.userService.findByResetToken(resetPasswordDto.token);
            if (!user) {
                return ApiResponse.error(
                    res,
                    '無效或過期的重設密碼連結',
                    'INVALID_RESET_TOKEN',
                    null,
                    400,
                );
            }

            // 更新密碼
            await this.userService.resetPassword(user.id, resetPasswordDto.newPassword);

            return ApiResponse.success(res, { message: '密碼已成功重設' });
        } catch (error) {
            console.error('Reset password error:', error);
            return ApiResponse.error(res, '重設密碼時發生錯誤', 'RESET_PASSWORD_ERROR', null, 500);
        }
    };

    verifyEmail = async (req: Request, res: Response) => {
        try {
            const { token } = req.body;

            if (!token) {
                return ApiResponse.error(
                    res,
                    'Verification token is required',
                    'MISSING_TOKEN',
                    null,
                    400,
                );
            }

            const user = await this.userService.findByVerificationToken(token);
            if (!user) {
                return ApiResponse.error(
                    res,
                    'Invalid or expired verification link',
                    'INVALID_TOKEN',
                    null,
                    400,
                );
            }

            // 更新用戶的驗證狀態並獲取更新後的用戶信息
            const verifiedUser = await this.userService.verifyEmail(user.id);

            // 生成 JWT token
            const jwtToken = await this.authService.generateToken(verifiedUser);

            return ApiResponse.success(res, { user: verifiedUser }, 200, {
                Authorization: `Bearer ${jwtToken}`,
            });
        } catch (error) {
            console.error('Email verification error:', error);
            return ApiResponse.error(
                res,
                'Email verification failed',
                'VERIFICATION_ERROR',
                null,
                500,
            );
        }
    };
}
