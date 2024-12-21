import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

export class LinkService {
    async create(data: Prisma.LinkCreateInput) {
        const link = await prisma.link.create({
            data,
            include: {
                user: true,
                profile: true,
            },
        });
        return link;
    }

    async findAll() {
        return await prisma.link.findMany({
            include: {
                user: true,
                profile: true,
            },
        });
    }
}
