import { Service } from 'typedi';
import { Request, Response } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiResponse } from '../../utils/apiResponse';
import {
    AddMemberDto,
    UpdateMemberDto,
    UpdateMemberStatusDto,
    SoftDeleteMemberDto,
} from '../dtos/member.dto';
import { MemberService } from '../services/MemberService';
import { MembershipStatus } from '@prisma/client';

@Service()
export class MemberController {
    constructor(private memberService: MemberService) {}

    /**
     * 獲取協會會員列表
     * GET /associations/:id/members
     */
    getMembers = async (req: Request, res: Response) => {
        try {
            const associationId = req.params.id;
            const includeInactive = req.query.includeInactive === 'true';
            const includeDeleted = req.query.includeDeleted === 'true';

            const members = await this.memberService.getMembers(
                associationId,
                includeInactive,
                includeDeleted,
            );
            return ApiResponse.success(res, { members });
        } catch (error) {
            console.error('獲取會員列表失敗:', error);
            return ApiResponse.error(
                res,
                '獲取會員列表失敗',
                'GET_MEMBERS_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 獲取已刪除的會員列表
     * GET /associations/:id/deleted-members
     */
    getDeletedMembers = async (req: Request, res: Response) => {
        try {
            const associationId = req.params.id;
            const members = await this.memberService.getDeletedMembers(associationId);
            return ApiResponse.success(res, { members });
        } catch (error) {
            console.error('獲取已刪除會員列表失敗:', error);
            return ApiResponse.error(
                res,
                '獲取已刪除會員列表失敗',
                'GET_DELETED_MEMBERS_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 更新會員狀態
     * PATCH /associations/:id/members/:memberId/status
     */
    updateMemberStatus = async (req: Request, res: Response) => {
        try {
            const { id: associationId, memberId } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            const statusDto = plainToClass(UpdateMemberStatusDto, req.body);
            const errors = await validate(statusDto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            const member = await this.memberService.updateMemberStatus(
                memberId,
                associationId,
                statusDto.status,
                userId,
                statusDto.reason,
            );

            return ApiResponse.success(res, { member });
        } catch (error) {
            console.error('更新會員狀態失敗:', error);
            return ApiResponse.error(
                res,
                '更新會員狀態失敗',
                'UPDATE_STATUS_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 刪除會員（軟刪除）
     * DELETE /associations/:id/members/:memberId
     */
    removeMember = async (req: Request, res: Response) => {
        try {
            const { id: associationId, memberId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            if (!memberId) {
                return ApiResponse.error(res, '缺少會員ID', 'MISSING_MEMBER_ID', null, 400);
            }

            const deleteDto = plainToClass(SoftDeleteMemberDto, req.body);
            const result = await this.memberService.softDeleteMember(memberId, userId, deleteDto);

            return ApiResponse.success(res, result);
        } catch (error: unknown) {
            console.error('移除會員失敗:', error);

            // 嘗試將 error 當作符合 ApiError interface 的物件處理
            const message = (error as any)?.message || '移除會員失敗';
            const code = (error as any)?.code || 'REMOVE_MEMBER_ERROR';
            const details = (error as any)?.details;
            const status = (error as any)?.status || 500;

            // 檢查原始錯誤訊息是否為「會員不存在」
            if (message === '會員不存在') {
                // 如果服務層確實拋出了「會員不存在」的錯誤，返回 404
                return ApiResponse.notFound(res, '會員不存在', 'MEMBER_NOT_FOUND');
            }

            // 對於其他錯誤，使用提取或默認的信息返回
            return ApiResponse.error(res, message, code, details, status);
        }
    };

    /**
     * 暫停會員資格
     * PATCH /associations/:id/members/:memberId/suspend
     */
    suspendMember = async (req: Request, res: Response) => {
        try {
            const { id: associationId, memberId } = req.params;
            const userId = req.user?.id;
            const { reason } = req.body;

            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            const member = await this.memberService.suspendMember(
                memberId,
                associationId,
                userId,
                reason,
            );
            return ApiResponse.success(res, { member });
        } catch (error) {
            console.error('暫停會員失敗:', error);
            return ApiResponse.error(
                res,
                '暫停會員失敗',
                'SUSPEND_MEMBER_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 激活會員資格
     * PATCH /associations/:id/members/:memberId/activate
     */
    activateMember = async (req: Request, res: Response) => {
        try {
            const { id: associationId, memberId } = req.params;
            const userId = req.user?.id;
            const { reason } = req.body;

            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            const member = await this.memberService.activateMembership(
                memberId,
                associationId,
                userId,
                reason,
            );
            return ApiResponse.success(res, { member });
        } catch (error) {
            console.error('激活會員失敗:', error);
            return ApiResponse.error(
                res,
                '激活會員失敗',
                'ACTIVATE_MEMBER_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 取消會員資格
     * PATCH /associations/:id/members/:memberId/cancel
     */
    cancelMembership = async (req: Request, res: Response) => {
        try {
            const { id: associationId, memberId } = req.params;
            const userId = req.user?.id;
            const { reason } = req.body;

            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            const member = await this.memberService.cancelMembership(
                memberId,
                associationId,
                userId,
                reason,
            );
            return ApiResponse.success(res, { member });
        } catch (error) {
            console.error('取消會員資格失敗:', error);
            return ApiResponse.error(
                res,
                '取消會員資格失敗',
                'CANCEL_MEMBERSHIP_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 恢復已刪除會員
     * POST /associations/:id/members/:memberId/restore
     */
    restoreMember = async (req: Request, res: Response) => {
        try {
            const { id: associationId, memberId } = req.params;
            const userId = req.user?.id;
            const { reason } = req.body;

            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            const member = await this.memberService.restoreMember(
                memberId,
                associationId,
                userId,
                reason,
            );
            return ApiResponse.success(res, { member });
        } catch (error) {
            console.error('恢復會員失敗:', error);
            return ApiResponse.error(
                res,
                '恢復會員失敗',
                'RESTORE_MEMBER_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 會員續費
     * POST /associations/:id/members/:memberId/renew
     */
    renewMembership = async (req: Request, res: Response) => {
        try {
            const { id: associationId, memberId } = req.params;
            const userId = req.user?.id;
            const { months, reason } = req.body;

            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            if (!months || typeof months !== 'number' || months <= 0) {
                return ApiResponse.error(
                    res,
                    '無效的續費月數',
                    'INVALID_MONTHS',
                    '月數必須是正整數',
                    400,
                );
            }

            const member = await this.memberService.renewMembership(
                memberId,
                months,
                userId,
                reason,
            );
            return ApiResponse.success(res, { member });
        } catch (error) {
            console.error('會員續費失敗:', error);
            return ApiResponse.error(
                res,
                '會員續費失敗',
                'RENEW_MEMBERSHIP_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 獲取會員狀態變更歷史
     * GET /associations/members/:id/history
     */
    getMemberHistory = async (req: Request, res: Response) => {
        try {
            const memberId = req.params.id;
            const history = await this.memberService.getMemberStatusHistory(memberId);
            return ApiResponse.success(res, { history });
        } catch (error) {
            console.error('獲取會員歷史失敗:', error);
            return ApiResponse.error(
                res,
                '獲取會員歷史失敗',
                'GET_MEMBER_HISTORY_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 手動執行會員過期檢查（僅限管理員）
     * POST /associations/check-expiries
     */
    checkExpiredMemberships = async (req: Request, res: Response) => {
        try {
            const result = await this.memberService.checkExpiredMemberships();
            return ApiResponse.success(res, result);
        } catch (error) {
            console.error('檢查會員過期失敗:', error);
            return ApiResponse.error(
                res,
                '檢查會員過期失敗',
                'CHECK_EXPIRY_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 更新會員角色
     * PATCH /associations/:id/members/:memberId/role
     */
    updateMemberRole = async (req: Request, res: Response) => {
        try {
            const { id: associationId, memberId } = req.params;
            const { role } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            if (!['ADMIN', 'MEMBER'].includes(role)) {
                return ApiResponse.error(
                    res,
                    '無效的角色',
                    'INVALID_ROLE',
                    '角色必須是 ADMIN 或 MEMBER',
                    400,
                );
            }

            // 獲取成員所屬的協會
            const member = await this.memberService.getMemberById(memberId, associationId);
            if (!member) {
                return ApiResponse.error(res, '會員不存在', 'MEMBER_NOT_FOUND', null, 404);
            }

            // 獲取當前用戶在該協會的角色
            const userRole = await this.memberService.getUserRoleInAssociation(
                associationId,
                userId,
            );

            // 檢查操作權限
            if (role === 'ADMIN') {
                // 提升為管理員：需要是協會擁有者或管理員
                const canPromote = userRole === 'OWNER' || userRole === 'ADMIN';
                if (!canPromote) {
                    return ApiResponse.error(
                        res,
                        '無權將會員提升為管理員',
                        'PERMISSION_DENIED',
                        null,
                        403,
                    );
                }
            } else if (role === 'MEMBER') {
                // 降級為普通會員：只有協會擁有者可以降級管理員
                const currentRole = member.role;

                // 如果目標會員已經是普通會員，則不需要特殊權限檢查
                if (currentRole === 'ADMIN') {
                    // 降級管理員：需要是協會擁有者
                    if (userRole !== 'OWNER') {
                        return ApiResponse.error(
                            res,
                            '只有協會擁有者可以將管理員降級',
                            'PERMISSION_DENIED',
                            null,
                            403,
                        );
                    }
                }
            }

            // 執行更新
            const updatedMember = await this.memberService.updateMemberRole(memberId, role);
            return ApiResponse.success(res, { member: updatedMember });
        } catch (error) {
            console.error('更新會員角色失敗:', error);
            return ApiResponse.error(
                res,
                '更新會員角色失敗',
                'UPDATE_ROLE_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 更新會員目錄可見性
     * PATCH /associations/members/:id/visibility
     */
    updateDirectoryVisibility = async (req: Request, res: Response) => {
        try {
            const memberId = req.params.id;
            const { displayInDirectory } = req.body;

            if (typeof displayInDirectory !== 'boolean') {
                return ApiResponse.error(
                    res,
                    '無效的參數',
                    'INVALID_PARAM',
                    'displayInDirectory 必須是布爾值',
                    400,
                );
            }

            const member = await this.memberService.updateDirectoryVisibility(
                memberId,
                displayInDirectory,
            );
            return ApiResponse.success(res, { member });
        } catch (error) {
            console.error('更新目錄可見性失敗:', error);
            return ApiResponse.error(
                res,
                '更新目錄可見性失敗',
                'UPDATE_VISIBILITY_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 獲取當前用戶加入的協會
     * GET /my-associations
     */
    getUserAssociations = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            const associations = await this.memberService.getUserAssociations(userId);
            return ApiResponse.success(res, { associations });
        } catch (error) {
            console.error('獲取用戶協會失敗:', error);
            return ApiResponse.error(
                res,
                '獲取用戶協會失敗',
                'GET_USER_ASSOCIATIONS_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 獲取當前用戶管理的協會（擁有者或管理員角色）
     * GET /managed-associations
     */
    getManagedAssociations = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            const associations = await this.memberService.getManagedAssociations(userId);
            return ApiResponse.success(res, { associations });
        } catch (error) {
            console.error('獲取用戶管理的協會失敗:', error);
            return ApiResponse.error(
                res,
                '獲取用戶管理的協會失敗',
                'GET_MANAGED_ASSOCIATIONS_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    addMember = async (req: Request, res: Response) => {
        try {
            const { id } = req.params; // associationId
            const userId = req.user?.id;
            const dto = plainToClass(AddMemberDto, req.body);
            const errors = await validate(dto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            // 檢查用戶是否有權限添加會員
            const canAdd = await this.memberService.canUserManageMembers(id, userId as string);
            if (!canAdd) {
                return ApiResponse.error(res, '無權添加會員', 'PERMISSION_DENIED', null, 403);
            }

            const member = await this.memberService.addMember(id, dto);
            return ApiResponse.success(res, { member });
        } catch (error: any) {
            return ApiResponse.error(res, '添加會員失敗', 'ADD_MEMBER_ERROR', error.message, 500);
        }
    };

    updateMember = async (req: Request, res: Response) => {
        try {
            const { id, memberId } = req.params;
            const userId = req.user?.id;
            const dto = plainToClass(UpdateMemberDto, req.body);
            const errors = await validate(dto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            // 檢查用戶是否有權限更新會員
            const canUpdate = await this.memberService.canUserManageMembers(id, userId as string);
            if (!canUpdate) {
                return ApiResponse.error(res, '無權更新會員', 'PERMISSION_DENIED', null, 403);
            }

            const member = await this.memberService.updateMember(memberId, dto);
            return ApiResponse.success(res, { member });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '更新會員失敗',
                'UPDATE_MEMBER_ERROR',
                error.message,
                500,
            );
        }
    };

    /**
     * 獲取特定狀態的會員列表
     * GET /associations/:id/members/by-status?status=STATUS1,STATUS2,...
     */
    getMembersByStatus = async (req: Request, res: Response) => {
        try {
            const associationId = req.params.id;

            // 解析狀態參數，可以是單一狀態或逗號分隔的多個狀態
            let statuses: MembershipStatus[] | undefined = undefined;
            const statusParam = req.query.status as string;

            if (statusParam) {
                if (statusParam.includes(',')) {
                    // 多個狀態，以逗號分隔
                    statuses = statusParam.split(',') as MembershipStatus[];

                    // 驗證狀態值是否有效
                    const validStatuses = Object.values(MembershipStatus);
                    const invalidStatuses = statuses.filter(
                        (s) => !validStatuses.includes(s as any),
                    );

                    if (invalidStatuses.length > 0) {
                        return ApiResponse.error(
                            res,
                            `無效的狀態值: ${invalidStatuses.join(', ')}`,
                            'INVALID_STATUS',
                            `有效的狀態值為: ${validStatuses.join(', ')}`,
                            400,
                        );
                    }
                } else {
                    // 單一狀態
                    if (!Object.values(MembershipStatus).includes(statusParam as any)) {
                        return ApiResponse.error(
                            res,
                            '無效的狀態值',
                            'INVALID_STATUS',
                            `有效的狀態值為: ${Object.values(MembershipStatus).join(', ')}`,
                            400,
                        );
                    }
                    statuses = [statusParam as MembershipStatus];
                }
            }

            const members = await this.memberService.getMembersByStatus(associationId, statuses);
            return ApiResponse.success(res, { members });
        } catch (error) {
            console.error('獲取會員列表失敗:', error);
            return ApiResponse.error(
                res,
                '獲取會員列表失敗',
                'GET_MEMBERS_BY_STATUS_ERROR',
                (error as Error).message,
                500,
            );
        }
    };
}
