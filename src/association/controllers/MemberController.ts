import { Service } from 'typedi';
import { Request, Response } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiResponse } from '../../utils/apiResponse';
import { AddMemberDto, UpdateMemberDto } from '../dtos/member.dto';
import { MemberService } from '../services/MemberService';

@Service()
export class MemberController {
    constructor(private memberService: MemberService) {}

    getMembers = async (req: Request, res: Response) => {
        try {
            const { id } = req.params; // associationId
            const members = await this.memberService.findByAssociationId(id);
            return ApiResponse.success(res, { members });
        } catch (error: any) {
            return ApiResponse.error(res, '獲取會員失敗', 'GET_MEMBERS_ERROR', error.message, 500);
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
            return ApiResponse.success(res, { member }, 201);
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

    removeMember = async (req: Request, res: Response) => {
        try {
            const { id, memberId } = req.params;
            const userId = req.user?.id;

            // 檢查用戶是否有權限刪除會員
            const canRemove = await this.memberService.canUserManageMembers(id, userId as string);
            if (!canRemove) {
                return ApiResponse.error(res, '無權刪除會員', 'PERMISSION_DENIED', null, 403);
            }

            await this.memberService.removeMember(memberId);
            return ApiResponse.success(res, { message: '會員已成功刪除' });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '刪除會員失敗',
                'REMOVE_MEMBER_ERROR',
                error.message,
                500,
            );
        }
    };

    getUserAssociations = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            const memberships = await this.memberService.findAssociationsByUserId(userId);
            return ApiResponse.success(res, { memberships });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '獲取用戶協會失敗',
                'GET_USER_ASSOCIATIONS_ERROR',
                error.message,
                500,
            );
        }
    };
}
