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
            // 此處假設使用了multer中間件處理文件上傳
            const file = req.file;
            if (!file) {
                return ApiResponse.error(res, '未提供CSV文件', 'FILE_REQUIRED', null, 400);
            }

            // 讀取CSV文件
            const results: any[] = [];
            const validEntries: any[] = [];
            const invalidEntries: any[] = [];

            // 使用Promise處理CSV解析
            await new Promise<void>((resolve, reject) => {
                fs.createReadStream(file.path)
                    .pipe(csv())
                    .on('data', (data: any) => results.push(data))
                    .on('end', () => {
                        // 驗證每一行數據
                        results.forEach((row) => {
                            // 基本驗證：檢查email字段
                            if (!row.email || !this.isValidEmail(row.email)) {
                                invalidEntries.push({
                                    data: row,
                                    errors: ['無效的電子郵件格式'],
                                });
                            } else {
                                validEntries.push({
                                    email: row.email,
                                    name: row.name || '',
                                    role: this.isValidRole(row.role) ? row.role : 'MEMBER',
                                });
                            }
                        });
                        resolve();
                    })
                    .on('error', reject);
            });

            // 刪除臨時文件
            fs.unlinkSync(file.path);

            return ApiResponse.success(res, {
                validEntries,
                invalidEntries,
                total: results.length,
                valid: validEntries.length,
                invalid: invalidEntries.length,
            });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '處理CSV文件失敗',
                'CSV_PROCESSING_ERROR',
                error.message,
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
