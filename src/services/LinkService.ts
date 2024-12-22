import { LinkPlatform } from '@prisma/client';
import prisma from '../lib/prisma';
import { ReorderLinkDto, CreateLinkDto, UpdateLinkDto } from '../dtos/link.dto';
import { isValidPlatformForType, validatePlatformUrl } from '../validators/link.validator';
import { ErrorHandler } from '../utils/ErrorHandler';
import { Response } from 'express';

export class LinkService {
    async create(data: CreateLinkDto, userId: string, res: Response) {
        const profile = await prisma.profile.findFirst({
            where: { id: data.profile_id, user_id: userId },
        });

        if (!profile) {
            return ErrorHandler.forbidden(res, '無權訪問此檔案', 'PROFILE_ACCESS_DENIED');
        }

        if (!isValidPlatformForType(data.type, data.platform as LinkPlatform)) {
            return ErrorHandler.badRequest(res, '無效的平台類型組合', 'INVALID_PLATFORM_TYPE');
        }

        if (!validatePlatformUrl(data.platform as LinkPlatform, data.url)) {
            return ErrorHandler.badRequest(res, '無效的 URL 格式', 'INVALID_URL_FORMAT');
        }

        return await prisma.link.create({
            data: {
                title: data.title,
                url: data.url,
                description: data.description,
                is_active: data.is_active ?? true,
                icon: data.icon,
                display_order: data.display_order,
                type: data.type,
                platform: data.platform,
                user: { connect: { id: userId } },
                profile: { connect: { id: data.profile_id } },
            },
            include: {
                profile: true,
            },
        });
    }

    async findAll(userId: string) {
        return await prisma.link.findMany({
            where: { user_id: userId },
            include: {
                profile: true,
            },
            orderBy: { display_order: 'asc' },
        });
    }

    async update(id: string, data: UpdateLinkDto, userId: string, res: Response) {
        const link = await prisma.link.findFirst({
            where: { id, user_id: userId },
        });

        if (!link) {
            return ErrorHandler.notFound(res, '連結不存在或無權訪問', 'LINK_NOT_FOUND');
        }

        if (data.type && data.platform) {
            if (!isValidPlatformForType(data.type, data.platform)) {
                return ErrorHandler.badRequest(res, '無效的平台類型組合', 'INVALID_PLATFORM_TYPE');
            }
        }

        if (data.url && data.platform) {
            if (!validatePlatformUrl(data.platform, data.url)) {
                return ErrorHandler.badRequest(res, '無效的 URL 格式', 'INVALID_URL_FORMAT');
            }
        }

        return await prisma.link.update({
            where: { id },
            data,
            include: {
                profile: true,
            },
        });
    }

    async delete(id: string, userId: string, res: Response) {
        const link = await prisma.link.findFirst({
            where: { id, user_id: userId },
        });

        if (!link) {
            return ErrorHandler.notFound(res, '連結不存在或無權訪問', 'LINK_NOT_FOUND');
        }

        await prisma.link.delete({ where: { id } });
    }

    async reorder(links: ReorderLinkDto[], userId: string) {
        return await prisma.$transaction(
            links.map((link) =>
                prisma.link.update({
                    where: {
                        id: link.id,
                        user_id: userId,
                    },
                    data: {
                        display_order: link.display_order,
                    },
                }),
            ),
        );
    }

    async findByProfile(profileId: string, userId: string, res: Response) {
        const profile = await prisma.profile.findFirst({
            where: { id: profileId, user_id: userId },
            include: { links: true },
        });

        if (!profile) {
            return ErrorHandler.notFound(res, '檔案不存在或無權訪問', 'PROFILE_NOT_FOUND');
        }

        return profile.links;
    }
}
