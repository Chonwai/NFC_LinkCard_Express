import { Service } from 'typedi';
import { Request, Response } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { AssociationService } from '../services/AssociationService';
import { MemberService } from '../services/MemberService';
import {
    CreateAssociationDto,
    UpdateAssociationDto,
    CreateFullAssociationDto,
} from '../dtos/association.dto';
import { ApiResponse } from '../../utils/apiResponse';
import { PrismaClient, BadgeDisplayMode } from '@prisma/client';
import { ProfileService } from '../../services/ProfileService';
import { ProfileBadgeService } from '../services/ProfileBadgeService';
import { CreateAssociationProfileDto } from '../dtos/association-profile.dto';
import { CreateProfileDto } from '../../dtos/profile.dto';
import { generateRandomChars } from '../../utils/token';

// 注意：請確保在全局 components/schemas 中定義了 CreateAssociationDto, UpdateAssociationDto, Association, AssociationSummary 等 Schema
// 或者在 DTO 文件中使用 swagger-jsdoc 可識別的方式定義它們。

@Service()
export class AssociationController {
    private prisma: PrismaClient;

    constructor(
        private associationService: AssociationService,
        private profileService: ProfileService,
        private profileBadgeService: ProfileBadgeService,
        private memberService: MemberService,
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
    createAssociation = async (req: Request, res: Response) => {
        try {
            const createAssociationDto = plainToClass(CreateFullAssociationDto, req.body);
            const errors = await validate(createAssociationDto);

            if (errors.length > 0) {
                return ApiResponse.validationError(res, errors);
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
                return ApiResponse.validationError(res, errors);
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
    getUserAssociations = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            const page = parseInt(req.query.page as string, 10) || 1;
            const limit = parseInt(req.query.limit as string, 10) || 10;

            // 使用正確的服務方法
            const result = await this.associationService.findUserAssociations(userId, {
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
     * /api/association/associations/{id}/profiles:
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

            // 驗證請求體 DTO (可以複用或創建新的)
            const dto = plainToClass(CreateAssociationProfileDto, req.body);
            const errors = await validate(dto);
            if (errors.length > 0) {
                return ApiResponse.validationError(res, errors);
            }

            // 檢查用戶是否為協會成員 (調用現有服務方法)
            const isMember = await this.associationService.isUserMember(associationId, userId);
            if (!isMember) {
                return ApiResponse.error(res, '用戶不是協會成員', 'NOT_MEMBER', null, 403);
            }

            // 獲取協會信息用於生成 Profile 默認值
            const association = await this.associationService.findById(associationId);
            if (!association) {
                return ApiResponse.error(res, '協會不存在', 'ASSOCIATION_NOT_FOUND', null, 404);
            }

            // 獲取用戶信息用於生成 Profile 默認值
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                return ApiResponse.error(res, '用戶不存在', 'USER_NOT_FOUND', null, 404);
            }

            // --- 創建 Profile ---
            // 準備customization數據
            const customization = dto.customization || {};
            const profileCustomization = {
                associationBadge: customization.associationBadge !== false,
                associationTheme: customization.associationTheme !== false,
                associationBranding: customization.associationBranding || association.name,
                profileType: customization.profileType || 'ASSOCIATION_MEMBER',
            };

            // 準備傳遞給 ProfileService 的數據
            const profileData: CreateProfileDto = {
                // 使用基礎的 CreateProfileDto
                name: dto.name || `${association.name} - ${user.display_name || user.username}`, // 默認名稱
                description: dto.description || `Member of ${association.name}`, // 默認描述
                is_public: dto.isPublic !== undefined ? dto.isPublic : true,
                slug: `${association.slug}-${generateRandomChars(8)}`, // 生成唯一的 slug
                // 同時保留meta和customization字段
                meta: {
                    associationId: associationId,
                    isAssociationProfile: true,
                    customization: profileCustomization,
                },
                // 其他 Profile 必需的字段 (如果有的話)
            };

            // 調用 ProfileService 的 'create' 方法
            const newProfile = await this.profileService.create(profileData, userId);

            // --- 自動添加協會徽章到新 Profile ---
            let badgeInfo = null;
            if (profileCustomization.associationBadge) {
                try {
                    const badge = await this.profileBadgeService.createProfileBadge(
                        {
                            profileId: newProfile.id,
                            associationId: associationId,
                            displayMode: BadgeDisplayMode.FULL, // 默認顯示模式 (如果實現了)
                        },
                        userId,
                    );

                    badgeInfo = {
                        id: badge.id,
                        associationId: badge.associationId,
                        associationName: badge.associationName,
                        logo: badge.associationLogo,
                        color: (association.customization as any)?.primaryColor || '#3B82F6',
                    };
                } catch (badgeError) {
                    // 即使徽章創建失敗，Profile 也已創建，記錄錯誤但繼續
                    console.error(
                        `Failed to add badge to new profile ${newProfile.id} for association ${associationId}:`,
                        badgeError,
                    );
                }
            }

            // 構建符合前端期望的響應格式
            const responseProfile = {
                ...newProfile,
                customization: profileCustomization,
                badges: badgeInfo ? [badgeInfo] : [],
            };

            return ApiResponse.success(res, { profile: responseProfile }, 201);
        } catch (error: any) {
            console.error('創建協會 Profile 失敗:', error);
            return ApiResponse.error(
                res,
                '創建協會 Profile 失敗',
                'CREATE_ASSOC_PROFILE_ERROR',
                error.message,
                500,
            );
        }
    };

    /**
     * @openapi
     * /api/association/associations/{id}/upload-logo:
     *   post:
     *     tags:
     *       - Association Management
     *     summary: 上傳協會標誌
     *     description: 上傳協會的標誌圖片
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         description: 協會ID
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               logo:
     *                 type: string
     *                 format: binary
     *                 description: 標誌圖片文件
     *     responses:
     *       200:
     *         description: 上傳成功
     *       400:
     *         description: 無效請求
     *       401:
     *         description: 未授權
     *       403:
     *         description: 禁止訪問
     *       500:
     *         description: 服務器錯誤
     */
    uploadLogo = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            const canUpdate = await this.associationService.canUserUpdateAssociation(id, userId);
            if (!canUpdate) {
                return ApiResponse.error(res, '無權更新協會', 'PERMISSION_DENIED', null, 403);
            }

            const file = req.file;
            if (!file) {
                return ApiResponse.error(res, '缺少文件', 'FILE_MISSING', null, 400);
            }

            // 檢查文件類型
            if (!file.mimetype.startsWith('image/')) {
                return ApiResponse.error(res, '無效的文件類型', 'INVALID_FILE_TYPE', null, 400);
            }

            // 生成文件名
            const fileExtension = file.originalname.split('.').pop() || 'jpg';
            const fileName = `associations/logos/${id}_${Date.now()}.${fileExtension}`;

            // 上傳到Vercel Blob
            const { put } = await import('@vercel/blob');
            const { url } = await put(fileName, file.buffer, {
                access: 'public',
                contentType: file.mimetype,
            });

            // 更新協會資料
            const association = await this.associationService.update(id, { logo: url });

            return ApiResponse.success(res, { logo: url, association });
        } catch (error: any) {
            console.error('上傳協會標誌時出錯:', error);
            return ApiResponse.error(
                res,
                error.message || '上傳協會標誌失敗',
                error.code || 'UPLOAD_LOGO_ERROR',
                null,
                error.status || 500,
            );
        }
    };

    /**
     * @openapi
     * /api/association/associations/{id}/upload-banner:
     *   post:
     *     tags:
     *       - Association Management
     *     summary: 上傳協會橫幅
     *     description: 上傳協會的橫幅圖片
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         description: 協會ID
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               banner:
     *                 type: string
     *                 format: binary
     *                 description: 橫幅圖片文件
     *     responses:
     *       200:
     *         description: 上傳成功
     *       400:
     *         description: 無效請求
     *       401:
     *         description: 未授權
     *       403:
     *         description: 禁止訪問
     *       500:
     *         description: 服務器錯誤
     */
    uploadBanner = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            const canUpdate = await this.associationService.canUserUpdateAssociation(id, userId);
            if (!canUpdate) {
                return ApiResponse.error(res, '無權更新協會', 'PERMISSION_DENIED', null, 403);
            }

            const file = req.file;
            if (!file) {
                return ApiResponse.error(res, '缺少文件', 'FILE_MISSING', null, 400);
            }

            // 檢查文件類型
            if (!file.mimetype.startsWith('image/')) {
                return ApiResponse.error(res, '無效的文件類型', 'INVALID_FILE_TYPE', null, 400);
            }

            // 生成文件名
            const fileExtension = file.originalname.split('.').pop() || 'jpg';
            const fileName = `associations/banners/${id}_${Date.now()}.${fileExtension}`;

            // 上傳到Vercel Blob
            const { put } = await import('@vercel/blob');
            const { url } = await put(fileName, file.buffer, {
                access: 'public',
                contentType: file.mimetype,
            });

            // 更新協會資料
            const association = await this.associationService.update(id, { banner: url });

            return ApiResponse.success(res, { banner: url, association });
        } catch (error: any) {
            console.error('上傳協會橫幅時出錯:', error);
            return ApiResponse.error(
                res,
                error.message || '上傳協會橫幅失敗',
                error.code || 'UPLOAD_BANNER_ERROR',
                null,
                error.status || 500,
            );
        }
    };

    /**
     * @openapi
     * /api/association/associations/by-slug/{slug}:
     *   get:
     *     tags:
     *       - Association
     *     summary: 通過slug獲取協會詳情
     *     description: 根據提供的slug檢索特定協會的詳細資訊。公開協會無需驗證，私有協會需要登入。
     *     parameters:
     *       - name: slug
     *         in: path
     *         required: true
     *         description: 協會的唯一slug
     *         schema:
     *           type: string
     *     responses:
     *       '200':
     *         description: 成功檢索到協會數據。
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ApiResponseSuccessAssociation'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     *       '404':
     *         $ref: '#/components/responses/NotFound'
     *       '500':
     *         $ref: '#/components/responses/InternalServerError'
     */
    getAssociationBySlug = async (req: Request, res: Response) => {
        try {
            const { slug } = req.params;
            const association = await this.associationService.findBySlug(slug);

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
     * /api/association/associations/{id}/check-membership:
     *   get:
     *     tags:
     *       - Association Membership
     *     summary: 檢查用戶在指定協會的會員資格和狀態
     *     description: 檢查當前登入用戶是否為指定協會的成員，並返回其會員狀態詳情。
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/AssociationId'
     *     responses:
     *       '200':
     *         description: 成功獲取會員資格狀態。
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 data:
     *                   type: object
     *                   properties:
     *                     isMember:
     *                       type: boolean
     *                       description: 用戶是否為該協會成員
     *                       example: true
     *                     membership:
     *                       type: object
     *                       description: 會員詳細資訊 (僅當 isMember 為 true 時存在)
     *                       properties:
     *                         id:
     *                           type: string
     *                           format: uuid
     *                           description: 會員記錄 ID
     *                         role:
     *                           type: string
     *                           enum: [OWNER, ADMIN, MEMBER]
     *                           description: 會員角色
     *                         status:
     *                           type: string
     *                           enum: [ACTIVE, PENDING, INACTIVE, SUSPENDED, CANCELLED]
     *                           description: 會員狀態
     *                         joinedAt:
     *                           type: string
     *                           format: date-time
     *                           description: 加入時間
     *                       required:
     *                         - id
     *                         - role
     *                         - status
     *                         - joinedAt
     *                   required:
     *                     - isMember
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '404':
     *         $ref: '#/components/responses/NotFound' # Association or User not found
     *       '500':
     *         $ref: '#/components/responses/InternalServerError'
     */
    checkMembership = async (req: Request, res: Response) => {
        try {
            const { id: associationId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.unauthorized(res, '用戶未認證');
            }

            console.log('associationId: ', associationId);
            console.log('userId: ', userId);

            // 假設 memberService.getMembershipDetails 返回會員詳情或 null
            const membershipDetails = await this.memberService.getMemberById(userId, associationId);

            console.log('membershipDetails: ', membershipDetails);

            if (membershipDetails && membershipDetails.membershipStatus !== 'TERMINATED') {
                // 用戶是會員，返回詳細資訊
                return ApiResponse.success(res, {
                    isMember: true,
                    membership: {
                        id: membershipDetails.id,
                        role: membershipDetails.role,
                        status: membershipDetails.membershipStatus, // 注意 Prisma 模型中的字段名可能是 membershipStatus
                        joinedAt: membershipDetails.createdAt,
                        // 可以根據 DTO 或需求添加更多字段
                    },
                });
            } else {
                // 用戶不是會員
                return ApiResponse.success(res, { isMember: false });
            }
        } catch (error: any) {
            console.error('檢查會員資格失敗:', error);
            // 處理可能的錯誤，例如協會不存在等
            if (error.code === 'ASSOCIATION_NOT_FOUND' || error.code === 'USER_NOT_FOUND') {
                return ApiResponse.notFound(res, error.message);
            }
            return ApiResponse.serverError(res, '檢查會員資格時發生錯誤');
        }
    };
}
