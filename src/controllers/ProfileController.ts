import { Request, Response } from 'express';
import { ProfileService } from '../services/ProfileService';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../types/error.types';
import { plainToClass } from 'class-transformer';
import { CreateProfileDto, UpdateProfileDto } from '../dtos/profile.dto';
import { validate } from 'class-validator';
import { MemberService } from '../association/services/MemberService';
import { Service } from 'typedi';
import { Container } from 'typedi';
import { ProfileBadgeService } from '../association/services/ProfileBadgeService';
import { Profile } from '@prisma/client';

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

            // 獲取用戶個人檔案
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

            // 獲取每個檔案的徽章
            const profilesWithBadges = await Promise.all(
                profiles.map(async (profile) => {
                    try {
                        // 獲取該檔案的徽章 (使用現有的 ProfileBadgeService)
                        const profileBadgeService = Container.get(ProfileBadgeService);
                        const badges = await profileBadgeService.getProfileBadges(profile.id);

                        // 只保留必要的徽章信息，確保數據量最小化
                        const simpleBadges = badges
                            .filter((badge) => badge.isVisible) // 只顯示可見的徽章
                            .map((badge) => ({
                                id: badge.id,
                                associationId: badge.associationId,
                                associationName: badge.associationName,
                                associationSlug: badge.associationSlug,
                                logo: badge.associationLogo,
                                color: badge.customColor || '#1877F2', // 默認藍色，類似 Facebook
                                displayMode: badge.displayMode,
                                createdAt: badge.createdAt,
                            }))
                            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
                        // 返回包含徽章的檔案信息
                        return {
                            ...profile,
                            badges: simpleBadges,
                        };
                    } catch (error) {
                        console.error(`獲取檔案 ${profile.id} 的徽章時發生錯誤:`, error);
                        // 即使發生錯誤也返回原始檔案，徽章為空數組
                        return {
                            ...profile,
                            badges: [],
                        };
                    }
                }),
            );

            return ApiResponse.success(res, {
                profiles: profilesWithBadges,
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
            // 獲取基本檔案信息
            const profile = await this.profileService.findBySlug(req.params.slug);

            // 獲取檔案徽章
            let profileWithBadges: any = { ...profile, badges: [] };

            try {
                const profileBadgeService = Container.get(ProfileBadgeService);
                const badges = await profileBadgeService.getProfileBadges(profile.id);

                // 只保留必要的徽章信息
                const simpleBadges = badges
                    .filter((badge) => badge.isVisible)
                    .map((badge) => ({
                        id: badge.id,
                        associationId: badge.associationId,
                        associationName: badge.associationName,
                        associationSlug: badge.associationSlug,
                        logo: badge.associationLogo,
                        color: badge.customColor || '#1877F2',
                        displayMode: badge.displayMode,
                        createdAt: badge.createdAt,
                    }))
                    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

                profileWithBadges = {
                    ...profile,
                    badges: simpleBadges,
                };
            } catch (error) {
                console.error(`Error fetching badges for profile ${profile.id}:`, error);
                // 即使獲取徽章失敗，我們仍繼續返回基本檔案信息
            }

            return ApiResponse.success(res, { profile: profileWithBadges });
        } catch (error: any) {
            // 處理 ProfileService.findBySlug 可能拋出的錯誤
            if (error.message === '檔案不存在') {
                return ApiResponse.error(res, '檔案不存在', 'PROFILE_NOT_FOUND', null, 404);
            } else if (error.message === '此檔案為私密') {
                return ApiResponse.error(res, '此檔案為私密', 'PROFILE_PRIVATE', null, 403);
            }

            // 處理其他未預期的錯誤
            return ApiResponse.error(
                res,
                '獲取檔案失敗',
                'PROFILE_FETCH_ERROR',
                error.message,
                500,
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
