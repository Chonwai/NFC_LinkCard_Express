import { Service } from 'typedi';
import { PrismaClient } from '@prisma/client';
import { AddMemberDto, UpdateMemberDto } from '../dtos/member.dto';

@Service()
export class MemberService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async findByAssociationId(associationId: string) {
        return this.prisma.associationMember.findMany({
            where: { associationId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        display_name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });
    }

    async addMember(associationId: string, dto: AddMemberDto) {
        const { userId, ...memberData } = dto;

        return this.prisma.associationMember.create({
            data: {
                ...memberData,
                association: { connect: { id: associationId } },
                user: { connect: { id: userId } },
            },
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

    async updateMember(memberId: string, dto: UpdateMemberDto) {
        return this.prisma.associationMember.update({
            where: { id: memberId },
            data: dto,
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

    async removeMember(memberId: string) {
        return this.prisma.associationMember.delete({
            where: { id: memberId },
        });
    }

    async canUserManageMembers(associationId: string, userId: string) {
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
}
