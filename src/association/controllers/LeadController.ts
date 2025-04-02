import { Service } from 'typedi';
import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';

@Service()
export class LeadController {
    createLead = async (req: Request, res: Response) => {
        // 臨時實現
        return ApiResponse.success(res, { message: '功能即將推出' });
    };

    getLeads = async (req: Request, res: Response) => {
        // 臨時實現
        return ApiResponse.success(res, { leads: [] });
    };

    updateLead = async (req: Request, res: Response) => {
        // 臨時實現
        return ApiResponse.success(res, { message: '功能即將推出' });
    };
}
