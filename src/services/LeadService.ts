import { Response } from 'express';
import prisma from '../lib/prisma';
import { CreateLeadDto } from '../dtos/lead.dto';
import { ErrorHandler } from '../utils/ErrorHandler';

export class LeadService {
    async create(data: CreateLeadDto, profileId: string, res: Response) {
        const profile = await prisma.profile.findFirst({
            where: {
                id: profileId,
                enable_lead_capture: true,
            },
        });

        if (!profile) {
            return ErrorHandler.notFound(res, '檔案不存在或未啟用收集功能', 'PROFILE_NOT_FOUND');
        }

        return await prisma.lead.create({
            data: {
                ...data,
                profile: { connect: { id: profileId } },
            },
        });
    }

    async findByProfile(profileId: string, userId: string, res: Response) {
        const profile = await prisma.profile.findFirst({
            where: {
                id: profileId,
                user_id: userId,
            },
            include: {
                leads: {
                    orderBy: { created_at: 'desc' },
                },
                user: {
                    select: {
                        username: true,
                        display_name: true,
                        avatar: true,
                    },
                },
            },
        });

        if (!profile) {
            return ErrorHandler.notFound(res, '檔案不存在或無權訪問', 'PROFILE_NOT_FOUND');
        }

        if (profile.user_id !== userId) {
            return ErrorHandler.forbidden(res, '無權訪問此檔案的leads', 'LEADS_ACCESS_DENIED');
        }

        return {
            profile: {
                id: profile.id,
                name: profile.name,
                slug: profile.slug,
                enable_lead_capture: profile.enable_lead_capture,
                lead_capture_fields: profile.lead_capture_fields,
                user: profile.user,
            },
            leads: profile.leads,
        };
    }
}
