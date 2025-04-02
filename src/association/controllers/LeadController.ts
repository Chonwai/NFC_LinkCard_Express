import { Service } from 'typedi';
import { Request, Response } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiResponse } from '../../utils/apiResponse';
import { LeadService } from '../services/LeadService';
import { CreateLeadDto, UpdateLeadDto, LeadStatus } from '../dtos/lead.dto';

@Service()
export class LeadController {
    constructor(private readonly leadService: LeadService) {}

    /**
     * 創建新的潛在客戶記錄
     * 允許公開訪問，用於網站訪客提交加入申請
     * @param req 請求對象
     * @param res 響應對象
     */
    createLead = async (req: Request, res: Response) => {
        try {
            const { id: associationId } = req.params;
            const dto = plainToClass(CreateLeadDto, req.body);

            // 添加來源信息（如有）
            if (req.headers.referer) {
                dto.source = req.headers.referer;
            }

            // 驗證輸入數據
            const errors = await validate(dto);
            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            // 創建潛在客戶
            const lead = await this.leadService.createLead(associationId, dto);

            return ApiResponse.success(
                res,
                {
                    message: '您的申請已成功提交，協會將儘快與您聯繫',
                    lead: {
                        id: lead.id,
                        createdAt: lead.createdAt,
                    },
                },
                201,
            );
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '提交申請失敗',
                'CREATE_LEAD_ERROR',
                error.message,
                error.message === '協會不存在' ? 404 : 500,
            );
        }
    };

    /**
     * 獲取協會的所有潛在客戶
     * 需要管理員權限
     * @param req 請求對象
     * @param res 響應對象
     */
    getLeads = async (req: Request, res: Response) => {
        try {
            const { id: associationId } = req.params;
            const userId = req.user?.id;

            // 檢查權限
            const canManage = await this.leadService.canManageLeads(
                associationId,
                userId as string,
            );
            if (!canManage) {
                return ApiResponse.error(
                    res,
                    '無權訪問潛在客戶數據',
                    'PERMISSION_DENIED',
                    null,
                    403,
                );
            }

            // 從查詢參數中獲取分頁和過濾信息
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const status = req.query.status as LeadStatus;

            // 獲取潛在客戶列表
            const result = await this.leadService.getLeads(associationId, status, page, limit);

            return ApiResponse.success(res, result);
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '獲取潛在客戶列表失敗',
                'GET_LEADS_ERROR',
                error.message,
                500,
            );
        }
    };

    /**
     * 獲取單個潛在客戶詳情
     * 需要管理員權限
     * @param req 請求對象
     * @param res 響應對象
     */
    getLeadById = async (req: Request, res: Response) => {
        try {
            const { id: associationId, leadId } = req.params;
            const userId = req.user?.id;

            // 檢查權限
            const canManage = await this.leadService.canManageLeads(
                associationId,
                userId as string,
            );
            if (!canManage) {
                return ApiResponse.error(
                    res,
                    '無權訪問潛在客戶數據',
                    'PERMISSION_DENIED',
                    null,
                    403,
                );
            }

            // 獲取潛在客戶詳情
            const lead = await this.leadService.getLeadById(leadId);

            // 確保潛在客戶屬於指定協會
            if (lead.associationId !== associationId) {
                return ApiResponse.error(res, '潛在客戶不存在', 'LEAD_NOT_FOUND', null, 404);
            }

            return ApiResponse.success(res, { lead });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '獲取潛在客戶詳情失敗',
                'GET_LEAD_ERROR',
                error.message,
                error.message === '潛在客戶不存在' ? 404 : 500,
            );
        }
    };

    /**
     * 更新潛在客戶信息
     * 需要管理員權限
     * @param req 請求對象
     * @param res 響應對象
     */
    updateLead = async (req: Request, res: Response) => {
        try {
            const { id: associationId, leadId } = req.params;
            const userId = req.user?.id;

            // 檢查權限
            const canManage = await this.leadService.canManageLeads(
                associationId,
                userId as string,
            );
            if (!canManage) {
                return ApiResponse.error(
                    res,
                    '無權更新潛在客戶數據',
                    'PERMISSION_DENIED',
                    null,
                    403,
                );
            }

            // 驗證輸入數據
            const dto = plainToClass(UpdateLeadDto, req.body);
            const errors = await validate(dto);
            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            // 更新潛在客戶
            const lead = await this.leadService.updateLead(leadId, dto);

            return ApiResponse.success(res, { lead });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '更新潛在客戶失敗',
                'UPDATE_LEAD_ERROR',
                error.message,
                error.message === '潛在客戶不存在' ? 404 : 500,
            );
        }
    };

    /**
     * 刪除潛在客戶
     * 需要管理員權限
     * @param req 請求對象
     * @param res 響應對象
     */
    deleteLead = async (req: Request, res: Response) => {
        try {
            const { id: associationId, leadId } = req.params;
            const userId = req.user?.id;

            // 檢查權限
            const canManage = await this.leadService.canManageLeads(
                associationId,
                userId as string,
            );
            if (!canManage) {
                return ApiResponse.error(
                    res,
                    '無權刪除潛在客戶數據',
                    'PERMISSION_DENIED',
                    null,
                    403,
                );
            }

            // 刪除潛在客戶
            await this.leadService.deleteLead(leadId);

            return ApiResponse.success(res, { message: '潛在客戶已成功刪除' });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '刪除潛在客戶失敗',
                'DELETE_LEAD_ERROR',
                error.message,
                error.message === '潛在客戶不存在' ? 404 : 500,
            );
        }
    };
}
