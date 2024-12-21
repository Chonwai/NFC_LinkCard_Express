import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { HttpException } from '../utils/HttpException';
import { ReorderLinkDto, CreateLinkDto } from '../dtos/link.dto';

export class LinkService {
    async create(data: CreateLinkDto, userId: string) {
        const profile = await prisma.profile.findFirst({
            where: { id: data.profile_id, user_id: userId },
        });

        if (!profile) {
            throw new HttpException(403, '無權訪問此檔案');
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
