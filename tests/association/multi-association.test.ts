import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { AssociationService } from '../../src/association/services/AssociationService';
import { MemberService } from '../../src/association/services/MemberService';

describe('Multi-Association Support Tests', () => {
    let prisma: PrismaClient;
    let associationService: AssociationService;
    let memberService: MemberService;
    let testUserId: string;
    let testUser2Id: string;

    beforeAll(async () => {
        prisma = new PrismaClient();
        associationService = new AssociationService();
        memberService = new MemberService();
        
        // 創建測試用戶
        const user1 = await prisma.user.create({
            data: {
                username: 'testuser1',
                email: 'test1@example.com',
                password: 'hashedpassword',
            },
        });
        testUserId = user1.id;

        const user2 = await prisma.user.create({
            data: {
                username: 'testuser2', 
                email: 'test2@example.com',
                password: 'hashedpassword',
            },
        });
        testUser2Id = user2.id;
    });

    afterAll(async () => {
        // 清理測試數據
        await prisma.association.deleteMany({
            where: {
                OR: [
                    { userId: testUserId },
                    { userId: testUser2Id },
                ],
            },
        });
        await prisma.user.deleteMany({
            where: {
                id: { in: [testUserId, testUser2Id] },
            },
        });
        await prisma.$disconnect();
    });

    describe('Backward Compatibility Tests', () => {
        it('should allow existing single association users to continue working', async () => {
            // 創建第一個協會（模擬現有用戶）
            const association1 = await associationService.create(testUserId, {
                name: 'Test Association 1',
                description: 'First association for backward compatibility test',
            });

            expect(association1).toBeDefined();
            expect(association1.name).toBe('Test Association 1');
            expect(association1.userId).toBe(testUserId);

            // 驗證現有的查詢功能仍然正常
            const foundAssociation = await associationService.findById(association1.id);
            expect(foundAssociation).toBeDefined();
            expect(foundAssociation?.name).toBe('Test Association 1');

            // 驗證權限檢查仍然正常
            const canUpdate = await associationService.canUserUpdateAssociation(association1.id, testUserId);
            expect(canUpdate).toBe(true);

            const cannotUpdate = await associationService.canUserUpdateAssociation(association1.id, testUser2Id);
            expect(cannotUpdate).toBe(false);
        });

        it('should maintain member relationship integrity', async () => {
            // 獲取用戶的協會
            const userAssociations = await associationService.findUserAssociations(testUserId, { page: 1, limit: 10 });
            expect(userAssociations.associations.length).toBeGreaterThan(0);

            const association = userAssociations.associations[0];

            // 添加成員到協會
            const member = await memberService.addMember(association.id, {
                userId: testUser2Id,
                role: 'MEMBER',
                membershipTier: 'BASIC',
                membershipStatus: 'ACTIVE',
            });

            expect(member).toBeDefined();
            expect(member.userId).toBe(testUser2Id);

            // 驗證會員關係查詢
            const isMember = await associationService.isUserMember(association.id, testUser2Id);
            expect(isMember).toBe(true);

            // 驗證角色查詢
            const role = await memberService.getUserRoleInAssociation(association.id, testUser2Id);
            expect(role).toBe('MEMBER');
        });
    });

    describe('New Multi-Association Functionality', () => {
        it('should allow users to create multiple associations', async () => {
            // 創建第二個協會（新功能）
            const association2 = await associationService.create(testUserId, {
                name: 'Test Association 2',
                description: 'Second association for multi-association test',
            });

            expect(association2).toBeDefined();
            expect(association2.name).toBe('Test Association 2');
            expect(association2.userId).toBe(testUserId);

            // 創建第三個協會
            const association3 = await associationService.create(testUserId, {
                name: 'Test Association 3',
                description: 'Third association for multi-association test',
            });

            expect(association3).toBeDefined();
            expect(association3.name).toBe('Test Association 3');
            expect(association3.userId).toBe(testUserId);

            // 驗證用戶現在有多個協會
            const userAssociations = await associationService.findUserAssociations(testUserId, { page: 1, limit: 10 });
            expect(userAssociations.associations.length).toBeGreaterThanOrEqual(3);

            // 確保每個協會都有唯一的ID和slug
            const associationIds = userAssociations.associations.map(a => a.id);
            const uniqueIds = new Set(associationIds);
            expect(uniqueIds.size).toBe(associationIds.length);
        });

        it('should maintain proper isolation between associations', async () => {
            const userAssociations = await associationService.findUserAssociations(testUserId, { page: 1, limit: 10 });
            expect(userAssociations.associations.length).toBeGreaterThanOrEqual(2);

            const [association1, association2] = userAssociations.associations;

            // 添加不同的成員到不同的協會
            const member1 = await memberService.addMember(association1.id, {
                userId: testUser2Id,
                role: 'ADMIN',
                membershipTier: 'PREMIUM',
                membershipStatus: 'ACTIVE',
            });

            // testUser2 在協會1中應該是ADMIN
            const role1 = await memberService.getUserRoleInAssociation(association1.id, testUser2Id);
            expect(role1).toBe('ADMIN');

            // testUser2 在協會2中應該沒有角色（不是成員）
            const role2 = await memberService.getUserRoleInAssociation(association2.id, testUser2Id);
            expect(role2).toBeNull();

            // 驗證權限隔離
            const canManageAssoc1 = await associationService.canUserUpdateAssociation(association1.id, testUser2Id);
            expect(canManageAssoc1).toBe(true); // 因為是ADMIN

            const canManageAssoc2 = await associationService.canUserUpdateAssociation(association2.id, testUser2Id);
            expect(canManageAssoc2).toBe(false); // 不是成員
        });
    });

    describe('Performance and Edge Cases', () => {
        it('should handle operations on specific associations efficiently', async () => {
            const userAssociations = await associationService.findUserAssociations(testUserId, { page: 1, limit: 10 });
            
            for (const association of userAssociations.associations) {
                // 每個協會的操作應該獨立且高效
                const found = await associationService.findById(association.id);
                expect(found).toBeDefined();
                expect(found?.id).toBe(association.id);

                // 權限檢查應該準確
                const canUpdate = await associationService.canUserUpdateAssociation(association.id, testUserId);
                expect(canUpdate).toBe(true);

                const canDelete = await associationService.canUserDeleteAssociation(association.id, testUserId);
                expect(canDelete).toBe(true);
            }
        });

        it('should handle managed associations correctly', async () => {
            const managedAssociations = await memberService.getManagedAssociations(testUserId);
            
            // 用戶應該能管理自己擁有的所有協會
            expect(managedAssociations.length).toBeGreaterThan(0);
            
            // 所有返回的協會都應該是OWNER角色
            for (const assoc of managedAssociations) {
                expect(assoc.role).toBe('OWNER');
                expect(assoc.association).toBeDefined();
            }
        });
    });

    describe('Data Integrity Tests', () => {
        it('should maintain referential integrity when deleting associations', async () => {
            // 創建一個測試協會
            const testAssociation = await associationService.create(testUserId, {
                name: 'Delete Test Association',
                description: 'Association for delete test',
            });

            // 添加成員
            await memberService.addMember(testAssociation.id, {
                userId: testUser2Id,
                role: 'MEMBER',
                membershipTier: 'BASIC',
                membershipStatus: 'ACTIVE',
            });

            // 刪除協會
            await associationService.delete(testAssociation.id);

            // 驗證協會已被刪除
            const deletedAssociation = await associationService.findById(testAssociation.id);
            expect(deletedAssociation).toBeNull();

            // 驗證級聯刪除正常工作（會員關係也應該被刪除）
            const members = await memberService.findByAssociationId(testAssociation.id);
            expect(members.length).toBe(0);
        });
    });
}); 