// src/association/dtos/lead.dto.ts
import { IsString, IsEmail, IsOptional, IsEnum, Length, IsNotEmpty } from 'class-validator';

export enum LeadStatus {
    NEW = 'NEW',
    CONTACTED = 'CONTACTED',
    QUALIFIED = 'QUALIFIED',
    CONVERTED = 'CONVERTED',
    REJECTED = 'REJECTED',
}

export class CreateLeadDto {
    @IsNotEmpty({ message: '名字不能為空' })
    @IsString()
    @Length(1, 100, { message: '名字長度需在1-100字符之間' })
    firstName: string;

    @IsNotEmpty({ message: '姓氏不能為空' })
    @IsString()
    @Length(1, 100, { message: '姓氏長度需在1-100字符之間' })
    lastName: string;

    @IsNotEmpty({ message: '電子郵件不能為空' })
    @IsEmail({}, { message: '無效的電子郵件格式' })
    email: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    @Length(0, 100, { message: '組織名稱不應超過100字符' })
    organization?: string;

    @IsOptional()
    @IsString()
    @Length(0, 1000, { message: '消息不應超過1000字符' })
    message?: string;
}

export class UpdateLeadDto {
    @IsOptional()
    @IsString()
    @Length(1, 100)
    firstName?: string;

    @IsOptional()
    @IsString()
    @Length(1, 100)
    lastName?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    organization?: string;

    @IsOptional()
    @IsString()
    @Length(0, 1000)
    message?: string;

    @IsOptional()
    @IsEnum(LeadStatus, { message: '無效的狀態值' })
    status?: LeadStatus;

    @IsOptional()
    @IsString()
    notes?: string;
}
