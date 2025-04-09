import { Service } from 'typedi';
import { Request, Response } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { AssociationService } from '../services/AssociationService';
import { CreateAssociationDto, UpdateAssociationDto } from '../dtos/association.dto';
import { ApiResponse } from '../../utils/apiResponse';
import { PrismaClient, BadgeDisplayMode } from '@prisma/client';
import { ProfileService } from '../../services/ProfileService';
import { ProfileBadgeService } from '../services/ProfileBadgeService';

// 注意：請確保在全局 components/schemas 中定義了 CreateAssociationDto, UpdateAssociationDto, Association, AssociationSummary 等 Schema
// 或者在 DTO 文件中使用 swagger-jsdoc 可識別的方式定義它們。

@Service()
export class AssociationController {
    private prisma: PrismaClient;

    constructor(
        private associationService: AssociationService,
        private profileService: ProfileService,
        private profileBadgeService: ProfileBadgeService,
    ) {
        this.prisma = new PrismaClient();
    }

    /**
     * @openapi
     * /api/association/associations:
     *   post:
     *     tags:
     *       - Association Management
     *     summary: Create a new association
     *     description: Create a new association and set the creator as the admin
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateAssociationDto'
     *     responses:
     *       201:
     *         description: Successfully created an association
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ApiResponse'
     *       400:
     *         description: Invalid input data
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Server error
     */
    async createAssociation(req: Request, res: Response) {
        try {
            const createAssociationDto = plainToClass(CreateAssociationDto, req.body);
            const errors = await validate(createAssociationDto);

            if (errors.length > 0) {
                return ApiResponse.validationError(res, '驗證錯誤', 'VALIDATION_ERROR', errors);
            }

            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.unauthorized(res, 'User not authenticated');
            }

            const association = await this.associationService.create(userId, createAssociationDto);
            return ApiResponse.created(res, association);
        } catch (error) {
            console.error('Error creating association:', error);
            return ApiResponse.serverError(
                res,
                (error as any).message || 'Failed to create association',
            );
        }
    }

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
    async createAssociationProfile(req: Request, res: Response) {
        try {
            const associationId = parseInt(req.params.id);
            if (isNaN(associationId)) {
                return ApiResponse.badRequest(res, 'Invalid association ID');
            }

            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.unauthorized(res, 'User not authenticated');
            }

            // 檢查用戶是否為協會的成員
            const isMember = await this.associationService.isUserMember(
                String(associationId),
                userId,
            );
            if (!isMember) {
                return ApiResponse.forbidden(res, 'You are not a member of this association');
            }

            // 創建協會的個人資料
            const profile = await this.profileService.create(
                {
                    name: req.body.name,
                },
                userId,
            );

            // 如果提供了徽章信息，則創建徽章
            if (req.body.badge) {
                await this.profileBadgeService.createProfileBadge({
                    profileId: profile.id,
                    associationId: String(associationId),
                    userId: userId,
                    displayMode: req.body.badge.displayMode || BadgeDisplayMode.BADGE_ONLY,
                    isVisible: req.body.badge.isEnabled || true,
                });
            }

            return ApiResponse.success(res, profile);
        } catch (error) {
            console.error('Error creating association profile:', error);
            return ApiResponse.serverError(
                res,
                (error as any).message || 'Failed to create association profile',
            );
        }
    }
}
