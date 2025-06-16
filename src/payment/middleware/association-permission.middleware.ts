import { Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { MemberService } from '../../association/services/MemberService';
import { ApiResponse } from '../../utils/apiResponse';

/**
 * 協會權限檢查中間件
 * 檢查用戶是否有管理指定協會的權限（必須是協會擁有者或管理員）
 */
export const checkAssociationManagePermission = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return ApiResponse.error(res, '用戶未認證', 'USER_NOT_AUTHENTICATED', null, 401);
        }

        // 從路由參數中獲取協會 ID
        const associationId = req.params.associationId || req.params.id;
        if (!associationId) {
            return ApiResponse.error(res, '缺少協會 ID', 'MISSING_ASSOCIATION_ID', null, 400);
        }

        const memberService = Container.get(MemberService);
        const canManage = await memberService.canUserManageMembers(associationId, userId);

        if (!canManage) {
            return ApiResponse.error(
                res,
                '無權管理此協會',
                'PERMISSION_DENIED',
                '只有協會擁有者或管理員可以執行此操作',
                403,
            );
        }

        // 將協會 ID 添加到請求中，方便後續使用
        req.associationId = associationId;
        next();
    } catch (error: unknown) {
        console.error('協會權限檢查失敗:', error);
        return ApiResponse.error(
            res,
            '權限檢查失敗',
            'PERMISSION_CHECK_ERROR',
            (error as Error).message,
            500,
        );
    }
};

/**
 * 檢查用戶是否有訪問協會資源的權限（至少是協會成員）
 */
export const checkAssociationAccessPermission = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return ApiResponse.error(res, '用戶未認證', 'USER_NOT_AUTHENTICATED', null, 401);
        }

        const associationId = req.params.associationId || req.params.id;
        if (!associationId) {
            return ApiResponse.error(res, '缺少協會 ID', 'MISSING_ASSOCIATION_ID', null, 400);
        }

        const memberService = Container.get(MemberService);
        const userRole = await memberService.getUserRoleInAssociation(associationId, userId);

        if (!userRole) {
            return ApiResponse.error(
                res,
                '無權訪問此協會',
                'ACCESS_DENIED',
                '只有協會成員可以訪問此資源',
                403,
            );
        }

        req.associationId = associationId;
        req.userRole = userRole;
        next();
    } catch (error: unknown) {
        console.error('協會訪問權限檢查失敗:', error);
        return ApiResponse.error(
            res,
            '權限檢查失敗',
            'PERMISSION_CHECK_ERROR',
            (error as Error).message,
            500,
        );
    }
};
