import { Service } from 'typedi';
import { PrismaClient, MemberRole, User } from '@prisma/client';
import { MemberInvitationItemDto, BatchMemberInvitationDto } from '../dtos/member-invitation.dto';
import * as crypto from 'crypto';

@Service()
export class MemberInvitationService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * 批量創建協會會員邀請
     * @param associationId 協會ID
     * @param dto 批量邀請數據
     * @returns 邀請處理結果
     */
    async batchInviteMembers(associationId: string, dto: BatchMemberInvitationDto) {
        // 檢查協會是否存在
        const association = await this.prisma.association.findUnique({
            where: { id: associationId },
            include: { user: true },
        });

        if (!association) {
            throw new Error('協會不存在');
        }

        // 處理結果統計
        const result = {
            total: dto.members.length,
            processed: 0,
            existing: 0, // 已經是會員
            invited: 0, // 邀請已發送
            created: 0, // 新創建的臨時用戶
            failed: 0, // 處理失敗
            details: [] as Array<{
                email: string;
                status: 'EXISTING' | 'INVITED' | 'CREATED' | 'FAILED';
                message?: string;
            }>,
        };

        // 逐個處理邀請
        for (const member of dto.members) {
            try {
                result.processed++;

                // 檢查用戶是否已存在
                let user = await this.prisma.user.findUnique({
                    where: { email: member.email },
                });

                // 檢查是否已是協會成員
                if (user) {
                    const existingMember = await this.prisma.associationMember.findUnique({
                        where: {
                            associationId_userId: {
                                associationId,
                                userId: user.id,
                            },
                        },
                    });

                    if (existingMember) {
                        // 用戶已是協會成員
                        result.existing++;
                        result.details.push({
                            email: member.email,
                            status: 'EXISTING',
                            message: '用戶已是協會成員',
                        });
                        continue;
                    }
                }

                // 處理邀請流程
                if (user) {
                    // 現有用戶 - 創建邀請
                    await this.createInvitation(association, user, member, dto.customMessage);
                    result.invited++;
                    result.details.push({
                        email: member.email,
                        status: 'INVITED',
                        message: '邀請已發送給現有用戶',
                    });
                } else {
                    // 新用戶 - 創建臨時帳戶並發送激活邀請
                    const newUser = await this.createTemporaryUser(member);
                    await this.createInvitation(association, newUser, member, dto.customMessage);
                    result.created++;
                    result.details.push({
                        email: member.email,
                        status: 'CREATED',
                        message: '臨時帳戶已創建並發送邀請',
                    });
                }
            } catch (error) {
                result.failed++;
                result.details.push({
                    email: member.email,
                    status: 'FAILED',
                    message: (error as Error).message,
                });
            }
        }

        return result;
    }

    /**
     * 創建臨時用戶
     * @param memberData 成員數據
     * @returns 創建的用戶
     */
    private async createTemporaryUser(memberData: MemberInvitationItemDto): Promise<User> {
        // 生成隨機用戶名和密碼
        const randomString = crypto.randomBytes(8).toString('hex');
        const username = `user_${randomString}`;
        const password = await this.hashPassword(crypto.randomBytes(10).toString('hex'));
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // 創建用戶
        return this.prisma.user.create({
            data: {
                email: memberData.email,
                username: username,
                password: password,
                display_name: memberData.name || null,
                is_verified: false,
                verification_token: verificationToken,
            },
        });
    }

    /**
     * 創建邀請記錄並發送邀請郵件
     * @param association 協會
     * @param user 用戶
     * @param memberData 成員數據
     * @param customMessage 自定義消息
     */
    private async createInvitation(
        association: any,
        user: User,
        memberData: MemberInvitationItemDto,
        customMessage?: string,
    ) {
        // 創建邀請令牌
        const invitationToken = crypto.randomBytes(32).toString('hex');

        // 儲存邀請資訊到用戶的meta字段
        const userMeta = user.meta || {};
        if (!userMeta.invitations) {
            userMeta.invitations = [];
        }

        userMeta.invitations.push({
            associationId: association.id,
            token: invitationToken,
            role: memberData.role || 'MEMBER',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14天有效期
        });

        // 更新用戶
        await this.prisma.user.update({
            where: { id: user.id },
            data: { meta: userMeta },
        });

        // TODO: 發送邀請郵件
        // 此處需要調用郵件服務發送邀請
        // emailService.sendAssociationInvitation(...)
    }

    /**
     * 簡單密碼加密（實際項目應使用bcrypt）
     */
    private async hashPassword(password: string): Promise<string> {
        // 注意：實際項目中應使用bcrypt等安全的哈希算法
        return crypto.createHash('sha256').update(password).digest('hex');
    }
}
