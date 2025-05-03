import { Request, Response } from 'express';
import { Service } from 'typedi';
import { ProfileBadgeService } from '../services/ProfileBadgeService';
import { ApiResponse } from '../../utils/apiResponse';
import { CreateProfileBadgeDto, UpdateProfileBadgeDto } from '../dtos/profile-badge.dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

@Service()
export class ProfileBadgeController {
    constructor(private readonly profileBadgeService: ProfileBadgeService) {}

    // 獲取個人檔案的所有徽章
    getProfileBadges = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const badges = await this.profileBadgeService.getProfileBadges(id);
            return ApiResponse.success(res, { badges });
        } catch (error) {
            return ApiResponse.error(
                res,
                (error as Error).message,
                'PROFILE_BADGE_ERROR',
                null,
                500,
            );
        }
    };

    // 添加徽章到個人檔案
    createProfileBadge = async (req: Request, res: Response) => {
        try {
            const { id } = req.params; // 個人檔案ID
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.error(res, '未授權的訪問', 'UNAUTHORIZED', null, 401);
            }

            // 創建不包含 userId 的 DTO 對象，使用適當的類型
            const dto = plainToClass(CreateProfileBadgeDto, {
                ...req.body,
                profileId: id,
                userId: userId, // 添加 userId 到 DTO
            });

            const errors = await validate(dto);
            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            // 將 userId 作為單獨參數傳遞給服務方法
            const badge = await this.profileBadgeService.createProfileBadge(
                {
                    profileId: dto.profileId,
                    associationId: dto.associationId,
                    displayOrder: dto.displayOrder,
                    isVisible: dto.isVisible,
                    customLabel: dto.customLabel,
                    customColor: dto.customColor,
                    customSize: dto.customSize,
                    displayMode: dto.displayMode,
                },
                userId,
            );
            return ApiResponse.success(res, { badge });
        } catch (error) {
            return ApiResponse.error(
                res,
                (error as Error).message,
                'PROFILE_BADGE_ERROR',
                null,
                500,
            );
        }
    };

    // 更新單個徽章
    updateProfileBadge = async (req: Request, res: Response) => {
        try {
            const { id } = req.params; // 徽章ID
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.error(res, '未授權的訪問', 'UNAUTHORIZED', null, 401);
            }

            const dto = plainToClass(UpdateProfileBadgeDto, req.body);
            const errors = await validate(dto);
            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            const badge = await this.profileBadgeService.updateProfileBadge(id, userId, dto);
            return ApiResponse.success(res, { badge });
        } catch (error) {
            return ApiResponse.error(
                res,
                (error as Error).message,
                'PROFILE_BADGE_ERROR',
                null,
                500,
            );
        }
    };

    // 批量更新徽章
    batchUpdateProfileBadges = async (req: Request, res: Response) => {
        try {
            const { id } = req.params; // 個人檔案ID
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.error(res, '未授權的訪問', 'UNAUTHORIZED', null, 401);
            }

            const badges = req.body.badges;
            if (!Array.isArray(badges)) {
                return ApiResponse.error(res, '無效的請求格式', 'INVALID_REQUEST', null, 400);
            }

            const updatedBadges = await this.profileBadgeService.batchUpdateProfileBadges(
                id,
                userId,
                badges,
            );
            return ApiResponse.success(res, { badges: updatedBadges });
        } catch (error) {
            return ApiResponse.error(
                res,
                (error as Error).message,
                'PROFILE_BADGE_ERROR',
                null,
                500,
            );
        }
    };

    // 刪除徽章
    deleteProfileBadge = async (req: Request, res: Response) => {
        try {
            const { id } = req.params; // 徽章ID
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.error(res, '未授權的訪問', 'UNAUTHORIZED', null, 401);
            }

            await this.profileBadgeService.deleteProfileBadge(id, userId);
            return ApiResponse.success(res, { message: '徽章已刪除' });
        } catch (error) {
            return ApiResponse.error(
                res,
                (error as Error).message,
                'PROFILE_BADGE_ERROR',
                null,
                500,
            );
        }
    };

    // // 獲取可用徽章
    // getAvailableBadges = async (req: Request, res: Response) => {
    //     try {
    //         const { id } = req.params; // 個人檔案ID
    //         const userId = req.user?.id;

    //         if (!userId) {
    //             return ApiResponse.error(res, '未授權的訪問', 'UNAUTHORIZED', null, 401);
    //         }

    //         const badges = await this.profileBadgeService.getAvailableBadges(userId, id);
    //         return ApiResponse.success(res, { badges });
    //     } catch (error) {
    //         return ApiResponse.error(
    //             res,
    //             (error as Error).message,
    //             'PROFILE_BADGE_ERROR',
    //             null,
    //             500,
    //         );
    //     }
    // };
}
