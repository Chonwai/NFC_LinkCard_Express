import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { HttpException } from '../utils/HttpException';
import { ReorderLinkDto, CreateLinkDto } from '../dtos/link.dto';
import { isValidPlatformForType, validatePlatformUrl } from '../validators/link.validator';
import { ApiResponse } from '../utils/apiResponse';

export class LinkService {
    async create(data: CreateLinkDto, userId: string) {
        const profile = await prisma.profile.findFirst({
            where: { id: data.profile_id, user_id: userId },
        });

        if (!profile) {
            // throw new HttpException(403, '無權訪問此檔案');
            // ApiResponse.error(res, '無權訪問此檔案', 'FORBIDDEN', null, 403);
        }

        if (!isValidPlatformForType(data.type, data.platform)) {
            throw new HttpException(400, '無效的平台類型組合');
        }

        if (!validatePlatformUrl(data.platform, data.url)) {
            throw new HttpException(400, '無效的 URL 格式');
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

    async update(id: string, data: Prisma.LinkUpdateInput, userId: string) {
        const link = await prisma.link.findFirst({
            where: { id, user_id: userId },
        });

        if (!link) {
            throw new HttpException(404, '連結不存在或無權訪問');
        }

        return await prisma.link.update({
            where: { id },
            data,
            include: {
                profile: true,
            },
        });
    }

    async delete(id: string, userId: string) {
        const link = await prisma.link.findFirst({
            where: { id, user_id: userId },
        });

        if (!link) {
            throw new HttpException(404, '連結不存在或無權訪問');
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

    async findByProfile(profileId: string, userId: string) {
        const profile = await prisma.profile.findFirst({
            where: { id: profileId, user_id: userId },
            include: { links: true },
        });

        if (!profile) {
            throw new HttpException(404, '檔案不存在或無權訪問');
        }

        return profile.links;
    }
}
