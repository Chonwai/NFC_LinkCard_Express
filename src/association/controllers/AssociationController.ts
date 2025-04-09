import { Service } from 'typedi';
import { Request, Response } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { AssociationService } from '../services/AssociationService';
import { CreateAssociationDto, UpdateAssociationDto } from '../dtos/association.dto';
import { ApiResponse } from '../../utils/apiResponse';
import { PrismaClient } from '@prisma/client';
import { ProfileService } from '../../services/ProfileService';
import { ProfileBadgeService } from '../services/ProfileBadgeService';

// 注意：請確保在全局 components/schemas 中定義了 CreateAssociationDto, UpdateAssociationDto, Association, AssociationSummary 等 Schema
// 或者在 DTO 文件中使用 swagger-jsdoc 可識別的方式定義它們。

// 添加 BadgeDisplayMode 枚舉 (以後應移到標準位置)
enum BadgeDisplayMode {
    HIDDEN = 'HIDDEN',
    BADGE_ONLY = 'BADGE_ONLY',
    FULL = 'FULL',
}

@Service()
export class AssociationController {
    constructor(
        private associationService: AssociationService,
        private profileService: ProfileService,
        private profileBadgeService: ProfileBadgeService,
    ) {}

    /**
     * @openapi
     * /api/association/associations:
     *   post:
     *     tags:
     *       - Association
     *     summary: 創建新協會
     *     description: 為當前登入的用戶創建一個新的協會記錄。
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       description: 創建協會所需的資料
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateAssociationDto'
     *     responses:
     *       '201':
     *         description: 協會創建成功。
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ApiResponseSuccessAssociation' # Define this schema
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '500':
     *         $ref: '#/components/responses/InternalServerError'
     */
    createAssociation = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                // This check aligns with the security requirement
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }
            const dto = plainToClass(CreateAssociationDto, req.body);
            const errors = await validate(dto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            // Pass userId to service for association creation
            const association = await this.associationService.create(userId, dto);
            return ApiResponse.success(res, { association }, 201);
        } catch (error: any) {
            // Basic error handling, consider a more robust global handler
            return ApiResponse.error(
                res,
                error.message || '創建協會失敗',
                error.code || 'CREATE_ASSOCIATION_ERROR',
                null,
                error.status || 500,
            );
        }
    };

    /**
     * @openapi
     * /api/association/associations/{id}:
     *   get:
     *     tags:
     *       - Association  // Changed tag back from 'Association Test'
     *     summary: 獲取指定協會詳情
     *     description: 根據提供的 ID 檢索特定協會的詳細資訊。公開協會無需驗證，私有協會需要登入。
     *     parameters:
     *       - $ref: '#/components/parameters/AssociationId' // Use the reusable parameter
     *     responses:
     *       '200':
     *         description: 成功檢索到協會數據。
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ApiResponseSuccessAssociation' // Use the reusable success response schema
     *       '403':
     *         $ref: '#/components/responses/Forbidden' // Use the reusable Forbidden response
     *       '404':
     *         $ref: '#/components/responses/NotFound' // Use the reusable NotFound response
     *       '500':
     *         $ref: '#/components/responses/InternalServerError' // Use the reusable InternalServerError response
     */
    getAssociation = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const association = await this.associationService.findById(id);

            if (!association) {
                return ApiResponse.error(res, '協會不存在', 'ASSOCIATION_NOT_FOUND', null, 404);
            }

            // Permission check for private associations
            if (!association.isPublic && !req.user) {
                return ApiResponse.error(res, '無權訪問', 'ACCESS_DENIED', null, 403);
            }

            return ApiResponse.success(res, { association });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                error.message || '獲取協會失敗',
                error.code || 'GET_ASSOCIATION_ERROR',
                null,
                error.status || 500,
            );
        }
    };

    /**
     * @openapi
     * /api/association/associations/{id}:
     *   put:
     *     tags:
     *       - Association
     *     summary: 更新指定協會資訊
     *     description: 更新指定 ID 的協會的資訊。需要用戶具有更新該協會的權限。
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/AssociationId'
     *     requestBody:
     *       description: 更新協會所需的資料
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateAssociationDto'
     *     responses:
     *       '200':
     *         description: 協會更新成功。
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ApiResponseSuccessAssociation'
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     *       '404':
     *         $ref: '#/components/responses/NotFound'
     *       '500':
     *         $ref: '#/components/responses/InternalServerError'
     */
    updateAssociation = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            const dto = plainToClass(UpdateAssociationDto, req.body);
            const errors = await validate(dto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            // Re-added permission check as per original logic structure
            const canUpdate = await this.associationService.canUserUpdateAssociation(id, userId);
            if (!canUpdate) {
                return ApiResponse.error(res, '無權更新協會', 'PERMISSION_DENIED', null, 403);
            }

            // Call service update with original signature
            const association = await this.associationService.update(id, dto);
            return ApiResponse.success(res, { association });
        } catch (error: any) {
            // Handle potential NotFound error from service if canUpdate passed but update failed
            if (error.code === 'ASSOCIATION_NOT_FOUND') {
                return ApiResponse.error(res, '協會不存在', 'ASSOCIATION_NOT_FOUND', null, 404);
            }
            return ApiResponse.error(
                res,
                error.message || '更新協會失敗',
                error.code || 'UPDATE_ASSOCIATION_ERROR',
                null,
                error.status || 500,
            );
        }
    };

    /**
     * @openapi
     * /api/association/associations/{id}:
     *   delete:
     *     tags:
     *       - Association
     *     summary: 刪除指定協會
     *     description: 刪除指定 ID 的協會。需要用戶具有刪除該協會的權限。
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/AssociationId'
     *     responses:
     *       '200':
     *         description: 協會刪除成功。
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ApiResponseSuccessMessage' # Define this schema
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     *       '404':
     *         $ref: '#/components/responses/NotFound'
     *       '500':
     *         $ref: '#/components/responses/InternalServerError'
     */
    deleteAssociation = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            // Re-added permission check as per original logic structure
            const canDelete = await this.associationService.canUserDeleteAssociation(id, userId);
            if (!canDelete) {
                return ApiResponse.error(res, '無權刪除協會', 'PERMISSION_DENIED', null, 403);
            }

            // Call service delete with original signature
            await this.associationService.delete(id);
            return ApiResponse.success(res, { message: '協會已成功刪除' });
        } catch (error: any) {
            // Handle potential NotFound error from service if canDelete passed but delete failed
            if (error.code === 'ASSOCIATION_NOT_FOUND') {
                return ApiResponse.error(res, '協會不存在', 'ASSOCIATION_NOT_FOUND', null, 404);
            }
            return ApiResponse.error(
                res,
                error.message || '刪除協會失敗',
                error.code || 'DELETE_ASSOCIATION_ERROR',
                null,
                error.status || 500,
            );
        }
    };

    /**
     * @openapi
     * /api/association/associations:
     *   get:
     *     tags:
     *       - Association
     *     summary: 獲取用戶相關的協會列表
     *     description: 檢索當前登入用戶創建或作為成員加入的所有協會的列表。
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/PageQuery'
     *       - $ref: '#/components/parameters/LimitQuery'
     *       # Add other potential query parameters for filtering/sorting here
     *     responses:
     *       '200':
     *         description: 成功檢索到協會列表。
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ApiResponseAssociationList'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '500':
     *         $ref: '#/components/responses/InternalServerError'
     */
    // IMPORTANT: This method needs to be implemented correctly.
    // The corresponding service method `findUserAssociations` must be created in AssociationService.
    // The route `GET /api/association/associations` in `src/association/routes/index.ts` must point to this method.
    getUserAssociations = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            const page = parseInt(req.query.page as string, 10) || 1;
            const limit = parseInt(req.query.limit as string, 10) || 10;

            // Assuming `findUserAssociations` exists or will be created in the service
            // It should handle fetching associations based on userId and pagination
            // TODO: Ensure findUserAssociations is implemented in AssociationService
            const result = await (this.associationService as any).findUserAssociations(userId, {
                page,
                limit,
            });
            return ApiResponse.success(res, result);
        } catch (error: any) {
            return ApiResponse.error(
                res,
                error.message || '獲取協會列表失敗',
                error.code || 'GET_ASSOCIATION_LIST_ERROR',
                null,
                error.status || 500,
            );
        }
    };

    /**
     * @openapi
     * /api/association/associations/{id}/profile:
     *   post:
     *     tags:
     *       - Association
     *     summary: 創建協會專屬Profile
     *     description: 為當前登入的用戶創建一個新的協會專屬Profile。
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/AssociationId'
     *     responses:
     *       '201':
     *         description: 協會專屬Profile創建成功。
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ApiResponseSuccessAssociation'
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     *       '404':
     *         $ref: '#/components/responses/NotFound'
     *       '500':
     *         $ref: '#/components/responses/InternalServerError'
     */
    createAssociationProfile = async (req: Request, res: Response) => {
        try {
            const { id: associationId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            // 檢查用戶是否為協會成員
            const isMember = await this.associationService.isUserMember(associationId, userId);

            if (!isMember) {
                return ApiResponse.error(res, '用戶不是協會成員', 'NOT_MEMBER', null, 403);
            }

            // 獲取協會信息用於Profile創建
            const association = await this.prisma.association.findUnique({
                where: { id: associationId },
            });

            if (!association) {
                return ApiResponse.error(res, '協會不存在', 'ASSOCIATION_NOT_FOUND', null, 404);
            }

            // 創建Profile
            const profile = await this.profileService.createProfile({
                userId,
                name: `${association.name} - ${req.user?.display_name || 'Member'}`,
                description: `${req.user?.display_name || 'Member'} at ${association.name}`,
                isPublic: true,
                meta: {
                    associationId,
                    isAssociationProfile: true,
                },
            });

            // 創建徽章
            await this.profileBadgeService.createProfileBadge({
                profileId: profile.id,
                associationId,
                title: association.name,
                description: `Official member of ${association.name}`,
                imageUrl: association.logo || '',
                displayMode: BadgeDisplayMode.FULL,
                position: 0,
            });

            return ApiResponse.success(res, { profile }, 201);
        } catch (error) {
            return ApiResponse.error(
                res,
                '創建協會檔案失敗',
                'PROFILE_CREATE_ERROR',
                (error as Error).message,
                500,
            );
        }
    };
}
