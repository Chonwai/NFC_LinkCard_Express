import { Request, Response } from 'express';
import { LinkService } from '../services/LinkService';
import { ApiResponse } from '../utils/apiResponse';

export class LinkController {
    private linkService: LinkService;

    constructor() {
        this.linkService = new LinkService();
    }

    create = async (req: Request, res: Response) => {
        try {
            const link = await this.linkService.create(req.body);
            return ApiResponse.success(res, { link }, 201);
        } catch (error: any) {
            return ApiResponse.error(res, '連結創建失敗', 'LINK_CREATE_ERROR', error.message, 400);
        }
    };

    getAll = async (req: Request, res: Response) => {
        try {
            const links = await this.linkService.findAll();
            return ApiResponse.success(res, { links });
        } catch (error: any) {
            return ApiResponse.error(res, '獲取連結失敗', 'LINK_FETCH_ERROR', error.message, 500);
        }
    };
}
