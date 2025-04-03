import { Service } from 'typedi';
import { Request, Response } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiResponse } from '../../utils/apiResponse';
import { MemberInvitationService } from '../services/MemberInvitationService';
import { BatchMemberInvitationDto, CsvUploadResultDto } from '../dtos/member-invitation.dto';
import { AssociationService } from '../services/AssociationService';
import * as csv from 'csv-parser';
import * as fs from 'fs';
import { InvitationResponseDto, InvitationResponseType } from '../dtos/invitation-response.dto';
import { parseCsv } from '../utils/csv-parser';

@Service()
export class MemberInvitationController {
    constructor(
        private memberInvitationService: MemberInvitationService,
        private associationService: AssociationService,
    ) {}

    /**
     * 批量邀請會員
     * @param req 請求
     * @param res 響應
     */
    batchInviteMembers = async (req: Request, res: Response) => {
        try {
            const { id: associationId } = req.params;
            const userId = req.user?.id;

            // 驗證權限
            const canManage = await this.associationService.canUserUpdateAssociation(
                associationId,
                userId as string,
            );
            if (!canManage) {
                return ApiResponse.error(res, '無權管理協會成員', 'PERMISSION_DENIED', null, 403);
            }

            // 驗證請求數據
            const dto = plainToClass(BatchMemberInvitationDto, req.body);
            const errors = await validate(dto);
            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            // 處理批量邀請
            const result = await this.memberInvitationService.batchInviteMembers(
                associationId,
                dto,
            );

            return ApiResponse.success(res, { result });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '批量邀請會員失敗',
                'BATCH_INVITE_ERROR',
                error.message,
                500,
            );
        }
    };

    /**
     * 處理上傳的CSV文件
     * @param req 請求
     * @param res 響應
     */
    processCsvUpload = async (req: Request, res: Response) => {
        try {
            if (!req.file) {
                return ApiResponse.error(res, '未上傳文件', 'NO_FILE_UPLOADED', null, 400);
            }

            const csvData = req.file.buffer.toString('utf8');
            const result = await parseCsv(csvData);

            return ApiResponse.success(res, result);
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '處理CSV文件失敗',
                'CSV_PROCESS_ERROR',
                error.message,
                500,
            );
        }
    };

    /**
     * 獲取用戶的所有協會邀請
     * GET /invitations
     */
    getUserInvitations = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            const invitations = await this.memberInvitationService.getUserInvitations(userId);
            return ApiResponse.success(res, { invitations });
        } catch (error) {
            console.error('獲取協會邀請失敗:', error);
            return ApiResponse.error(
                res,
                '獲取協會邀請失敗',
                'GET_INVITATIONS_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 回應協會邀請（接受或拒絕）
     * POST /invitations/respond
     */
    respondToInvitation = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return ApiResponse.error(res, '未授權', 'UNAUTHORIZED', null, 401);
            }

            const dto = plainToClass(InvitationResponseDto, req.body);
            const errors = await validate(dto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            const result = await this.memberInvitationService.processInvitationResponse(
                userId,
                dto.token,
                dto.response,
            );

            return ApiResponse.success(res, result);
        } catch (error) {
            console.error('處理邀請回應失敗:', error);
            return ApiResponse.error(
                res,
                '處理邀請回應失敗',
                'INVITATION_RESPONSE_ERROR',
                (error as Error).message,
                500,
            );
        }
    };

    /**
     * 簡單郵箱格式驗證
     */
    private isValidEmail(email: string): boolean {
        const re = /\S+@\S+\.\S+/;
        return re.test(email);
    }

    /**
     * 驗證角色是否有效
     */
    private isValidRole(role: string): boolean {
        return ['ADMIN', 'MEMBER'].includes(role);
    }
}
