import { Request, Response } from 'express';
import { ProfileService } from '../services/ProfileService';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../types/error.types';
import { plainToClass } from 'class-transformer';
import { CreateProfileDto, UpdateProfileDto } from '../dtos/profile.dto';
import { validate } from 'class-validator';
import { MemberService } from '../association/services/MemberService';
import { Service } from 'typedi';

@Service()
export class ProfileController {
    private profileService: ProfileService;
    private memberService: MemberService;

    constructor() {
        this.profileService = new ProfileService();
        this.memberService = new MemberService();
    }

    create = async (req: Request, res: Response) => {
        try {
            const createProfileDto = plainToClass(CreateProfileDto, req.body);
            const errors = await validate(createProfileDto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            const profile = await this.profileService.create(createProfileDto, req.user!.id);
            return ApiResponse.success(res, { profile });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '創建檔案失敗',
                'PROFILE_CREATE_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    getMyProfiles = async (req: Request, res: Response) => {
        try {
            const userId = req.user!.id;
            const profiles = await this.profileService.findByUserId(userId);

            // 檢查用戶是否有管理協會的權限
            let hasManageableAssociations = false;
            try {
                const managedAssociations = await this.memberService.getManagedAssociations(userId);
                hasManageableAssociations = managedAssociations.length > 0;
            } catch (error) {
                console.error('檢查協會管理權限時發生錯誤:', error);
                // 即使發生錯誤也繼續執行，不影響主要功能
            }

            return ApiResponse.success(res, {
                profiles,
                hasManageableAssociations,
            });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '獲取檔案失敗',
                'PROFILE_FETCH_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    getBySlug = async (req: Request, res: Response) => {
        try {
            const profile = await this.profileService.findBySlug(req.params.slug, res);
            return ApiResponse.success(res, { profile });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '檔案不存在',
                'PROFILE_NOT_FOUND',
                apiError.message,
                apiError.status || 404,
            );
        }
    };

    update = async (req: Request, res: Response) => {
        try {
            const updateProfileDto = plainToClass(UpdateProfileDto, req.body);
            const errors = await validate(updateProfileDto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            const profile = await this.profileService.update(
                req.params.id,
                updateProfileDto,
                req.user!.id,
                res,
            );
            return ApiResponse.success(res, { profile });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '更新檔案失敗',
                'PROFILE_UPDATE_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            await this.profileService.delete(req.params.id, req.user!.id, res);
            return ApiResponse.success(res, {});
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '刪除檔案失敗',
                'PROFILE_DELETE_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    setDefault = async (req: Request, res: Response) => {
        try {
            const profile = await this.profileService.setDefault(req.params.id, req.user!.id, res);
            return ApiResponse.success(res, { profile });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '設置默認檔案失敗',
                'PROFILE_SET_DEFAULT_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };

    uploadProfileImage = async (req: Request, res: Response) => {
        try {
            if (!req.file) {
                return ApiResponse.error(res, '請上傳圖片', 'NO_FILE_UPLOADED', null, 400);
            }

            const profile = await this.profileService.uploadProfileImage(
                req.params.id,
                req.user!.id,
                req.file,
                res,
            );
            return ApiResponse.success(res, { profile });
        } catch (error: unknown) {
            const apiError = error as ApiError;
            return ApiResponse.error(
                res,
                '上傳檔案封面失敗',
                'PROFILE_IMAGE_UPLOAD_ERROR',
                apiError.message,
                apiError.status || 500,
            );
        }
    };
}
