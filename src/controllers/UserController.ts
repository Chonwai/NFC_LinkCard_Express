import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../types/error.types';
import { plainToClass } from 'class-transformer';
import { UpdateUserDto, UpdatePasswordDto } from '../dtos/user.dto';
import { validate } from 'class-validator';

export class UserController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    getCurrentUser = async (req: Request, res: Response) => {
        try {
            const user = await this.userService.findById(req.user!.id);
            return ApiResponse.success(res, { user });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '獲取用戶資料失敗',
                'USER_FETCH_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    updateProfile = async (req: Request, res: Response) => {
        try {
            const updateUserDto = plainToClass(UpdateUserDto, req.body);
            const errors = await validate(updateUserDto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            const user = await this.userService.update(req.user!.id, updateUserDto);
            return ApiResponse.success(res, { user });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '更新用戶資料失敗',
                'USER_UPDATE_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    updatePassword = async (req: Request, res: Response) => {
        try {
            const updatePasswordDto = plainToClass(UpdatePasswordDto, req.body);
            const errors = await validate(updatePasswordDto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            await this.userService.updatePassword(req.user!.id, updatePasswordDto);
            return ApiResponse.success(res, { message: '密碼更新成功' });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '更新密碼失敗',
                'PASSWORD_UPDATE_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    uploadAvatar = async (req: Request, res: Response) => {
        try {
            if (!req.file) {
                return ApiResponse.error(res, '請上傳圖片', 'NO_FILE_UPLOADED', null, 400);
            }

            const avatarUrl = await this.userService.uploadAvatar(req.user!.id, req.file);
            return ApiResponse.success(res, { avatar_url: avatarUrl });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '上傳頭像失敗',
                'AVATAR_UPLOAD_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };
}
