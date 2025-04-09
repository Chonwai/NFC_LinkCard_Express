import { Service } from 'typedi';
import { PrismaClient } from '@prisma/client';
import {
    CreateAssociationDto,
    UpdateAssociationDto,
    CreateFullAssociationDto,
} from '../dtos/association.dto';

@Service()
export class AssociationService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async create(userId: string, dto: CreateFullAssociationDto) {
        // 檢查用戶是否已有協會
        const existingAssociation = await this.prisma.association.findUnique({
            where: { userId },
        });

        if (existingAssociation) {
            throw new Error('用戶已擁有協會');
        }

        return this.prisma.association.create({
            data: {
                ...dto,
                user: { connect: { id: userId } },
            },
        });
    }

    async findById(id: string) {
        return this.prisma.association.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
    }

    async update(id: string, dto: UpdateAssociationDto) {
        return this.prisma.association.update({
            where: { id },
            data: dto,
        });
    }

    async delete(id: string) {
        return this.prisma.association.delete({
            where: { id },
        });
    }

    async canUserUpdateAssociation(associationId: string, userId: string) {
        // 檢查用戶是否是協會擁有者
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
        });

        if (association?.userId === userId) {
            return true;
        }

        // 檢查用戶是否是協會管理員
        const member = await this.prisma.associationMember.findUnique({
            where: {
                associationId_userId: {
                    associationId,
                    userId,
                },
            },
        });

        return member?.role === 'ADMIN';
    }

    async canUserDeleteAssociation(associationId: string, userId: string) {
        // 只有協會擁有者才能刪除協會
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
        });

        return association?.userId === userId;
    }

    /**
     * 檢查用戶是否為協會成員
     * @param associationId 協會ID
     * @param userId 用戶ID
     * @returns 是否為協會成員
     */
    async isUserMember(associationId: string, userId: string): Promise<boolean> {
        // 檢查用戶是否是協會擁有者
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
        });

        if (association?.userId === userId) {
            return true;
        }

        // 檢查用戶是否是協會成員
        const member = await this.prisma.associationMember.findUnique({
            where: {
                associationId_userId: {
                    associationId,
                    userId,
                },
            },
        });

        return !!member;
    }
}
