import { IsString, IsEmail, IsArray, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MemberRole } from '@prisma/client';

/**
 * 單個成員邀請數據
 */
export class MemberInvitationItemDto {
    @IsEmail({}, { message: '必須提供有效的電子郵件' })
    email: string;

    @IsOptional()
    @IsString({ message: '姓名必須是字符串' })
    name?: string;

    @IsOptional()
    @IsEnum(MemberRole, { message: '角色必須是有效的成員角色' })
    role?: MemberRole = MemberRole.MEMBER;
}

/**
 * 批量邀請成員數據
 */
export class BatchMemberInvitationDto {
    @IsArray({ message: '成員列表必須是數組' })
    @ValidateNested({ each: true })
    @Type(() => MemberInvitationItemDto)
    members: MemberInvitationItemDto[];

    @IsOptional()
    @IsString()
    customMessage?: string; // 自定義邀請信息

    @IsOptional()
    sendEmail: boolean = true; // 是否發送邀請郵件
}

/**
 * 處理上傳的CSV文件的DTO
 */
export class CsvUploadResultDto {
    @IsArray()
    validEntries: MemberInvitationItemDto[];

    @IsArray()
    invalidEntries: Array<{
        data: any;
        errors: string[];
    }>;
}
