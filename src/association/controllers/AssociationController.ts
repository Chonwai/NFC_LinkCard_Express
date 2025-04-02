import { Service } from 'typedi';
import { Request, Response } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { AssociationService } from '../services/AssociationService';
import { CreateAssociationDto, UpdateAssociationDto } from '../dtos/association.dto';
import { ApiResponse } from '../../utils/apiResponse';

@Service()
export class AssociationController {
    constructor(private associationService: AssociationService) {}

    createAssociation = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            const dto = plainToClass(CreateAssociationDto, req.body);
            const errors = await validate(dto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            const association = await this.associationService.create(userId as string, dto);
            return ApiResponse.success(res, { association }, 201);
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '創建協會失敗',
                'CREATE_ASSOCIATION_ERROR',
                error.message,
                500,
            );
        }
    };

    getAssociation = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const association = await this.associationService.findById(id);

            if (!association) {
                return ApiResponse.error(res, '協會不存在', 'ASSOCIATION_NOT_FOUND', null, 404);
            }

            // 如果協會不是公開的且未登入，則不允許訪問
            if (!association.isPublic && !req.user) {
                return ApiResponse.error(res, '無權訪問', 'ACCESS_DENIED', null, 403);
            }

            return ApiResponse.success(res, { association });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '獲取協會失敗',
                'GET_ASSOCIATION_ERROR',
                error.message,
                500,
            );
        }
    };

    updateAssociation = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            const dto = plainToClass(UpdateAssociationDto, req.body);
            const errors = await validate(dto);

            if (errors.length > 0) {
                return ApiResponse.error(res, '驗證錯誤', 'VALIDATION_ERROR', errors, 400);
            }

            // 驗證用戶是否有權限更新協會
            const canUpdate = await this.associationService.canUserUpdateAssociation(
                id,
                userId as string,
            );
            if (!canUpdate) {
                return ApiResponse.error(res, '無權更新協會', 'PERMISSION_DENIED', null, 403);
            }

            const association = await this.associationService.update(id, dto);
            return ApiResponse.success(res, { association });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '更新協會失敗',
                'UPDATE_ASSOCIATION_ERROR',
                error.message,
                500,
            );
        }
    };

    deleteAssociation = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            // 驗證用戶是否有權限刪除協會
            const canDelete = await this.associationService.canUserDeleteAssociation(
                id,
                userId as string,
            );
            if (!canDelete) {
                return ApiResponse.error(res, '無權刪除協會', 'PERMISSION_DENIED', null, 403);
            }

            await this.associationService.delete(id);
            return ApiResponse.success(res, { message: '協會已成功刪除' });
        } catch (error: any) {
            return ApiResponse.error(
                res,
                '刪除協會失敗',
                'DELETE_ASSOCIATION_ERROR',
                error.message,
                500,
            );
        }
    };
}
