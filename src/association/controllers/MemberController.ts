import { Service } from 'typedi';
import { Request, Response } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiResponse } from '../../utils/apiResponse';
import { AddMemberDto, UpdateMemberDto } from '../dtos/member.dto';
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

            const members = await this.memberService.getMembers(associationId, includeInactive);
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
     * 更新會員狀態
     * PATCH /associations/members/:id/status
     */
    updateMemberStatus = async (req: Request, res: Response) => {
        try {
            const memberId = req.params.id;
            const { status } = req.body;

            if (!Object.values(MembershipStatus).includes(status)) {
                return ApiResponse.error(
                    res,
                    '無效的會員狀態',
                    'INVALID_STATUS',
                    '狀態必須是 ACTIVE, INACTIVE 或 PENDING',
                    400,
                );
            }

            const member = await this.memberService.updateMemberStatus(memberId, status);
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
     * 移除會員
     * DELETE /associations/members/:id
     */
    removeMember = async (req: Request, res: Response) => {
        try {
            const memberId = req.params.id;
            const result = await this.memberService.removeMember(memberId);
            return ApiResponse.success(res, result);
        } catch (error) {
            console.error('移除會員失敗:', error);
            return ApiResponse.error(
                res,
                '移除會員失敗',
                'REMOVE_MEMBER_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 更新會員角色
     * PATCH /associations/members/:id/role
     */
    updateMemberRole = async (req: Request, res: Response) => {
        try {
            const memberId = req.params.id;
            const { role } = req.body;

            if (!['ADMIN', 'MEMBER'].includes(role)) {
                return ApiResponse.error(
                    res,
                    '無效的角色',
                    'INVALID_ROLE',
                    '角色必須是 ADMIN 或 MEMBER',
                    400,
                );
            }

            const member = await this.memberService.updateMemberRole(memberId, role);
            return ApiResponse.success(res, { member });
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
}
