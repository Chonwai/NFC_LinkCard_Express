// src/association/dtos/lead.dto.ts
import {
    IsString,
    IsEmail,
    IsOptional,
    IsEnum,
    Length,
    IsNotEmpty,
    IsObject,
    ValidateNested,
    IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum LeadStatus {
    NEW = 'NEW',
    CONTACTED = 'CONTACTED',
    QUALIFIED = 'QUALIFIED',
    CONVERTED = 'CONVERTED',
    REJECTED = 'REJECTED',
}

// 🆕 Lead來源枚舉
export enum LeadSource {
    WEBSITE_CONTACT = 'WEBSITE_CONTACT',
    PURCHASE_INTENT = 'PURCHASE_INTENT',
    EVENT_REGISTRATION = 'EVENT_REGISTRATION',
    REFERRAL = 'REFERRAL',
    OTHER = 'OTHER',
}

// 🆕 Lead優先級枚舉
export enum LeadPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT',
}

// 🆕 購買上下文DTO
export class PurchaseContextDto {
    @IsNotEmpty()
    @IsUUID()
    associationId: string;

    @IsNotEmpty()
    @IsUUID()
    pricingPlanId: string;

    @IsOptional()
    @IsString()
    planName?: string;

    @IsOptional()
    amount?: number;

    @IsOptional()
    @IsString()
    currency?: string;
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

    // 🆕 新增字段
    @IsOptional()
    @IsEnum(LeadSource, { message: '無效的Lead來源' })
    source?: LeadSource;

    @IsOptional()
    @IsEnum(LeadPriority, { message: '無效的優先級' })
    priority?: LeadPriority;

    @IsOptional()
    @IsUUID()
    purchaseOrderId?: string;

    @IsOptional()
    @IsUUID()
    userId?: string;

    @IsOptional()
    @IsObject()
    metadata?: any;
}

// 🆕 擴展Create DTO支持新字段
export class CreateExtendedLeadDto extends CreateLeadDto {
    @IsOptional()
    @IsEnum(LeadSource, { message: '無效的Lead來源' })
    source?: LeadSource = LeadSource.WEBSITE_CONTACT;

    @IsOptional()
    @IsEnum(LeadPriority, { message: '無效的優先級' })
    priority?: LeadPriority = LeadPriority.MEDIUM;

    @IsOptional()
    @IsUUID()
    purchaseOrderId?: string;

    @IsOptional()
    @IsUUID()
    userId?: string;

    @IsOptional()
    @IsObject()
    metadata?: any;
}

// 🆕 購買意向Lead創建DTO
export class CreatePurchaseIntentLeadDto {
    // Lead基本信息
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

    // 購買上下文
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => PurchaseContextDto)
    purchaseContext: PurchaseContextDto;

    // 系統字段（自動設置）
    source: LeadSource = LeadSource.PURCHASE_INTENT;
    priority: LeadPriority = LeadPriority.HIGH;
}

// 🆕 Lead查詢過濾DTO
export class LeadFilterDto {
    @IsOptional()
    @IsEnum(LeadSource)
    source?: LeadSource;

    @IsOptional()
    @IsEnum(LeadStatus)
    status?: LeadStatus;

    @IsOptional()
    @IsEnum(LeadPriority)
    priority?: LeadPriority;

    @IsOptional()
    @IsString()
    sortBy?: 'createdAt' | 'priority' | 'status';

    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc';

    @IsOptional()
    page?: number = 1;

    @IsOptional()
    limit?: number = 20;
}

// 🆕 Lead響應DTO
export class LeadResponseDto {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    organization?: string;
    message?: string;
    status: LeadStatus;
    source: LeadSource;
    priority: LeadPriority;
    purchaseOrderId?: string;
    userId?: string;
    metadata?: any;
    associationId: string;
    createdAt: Date;
    updatedAt: Date;
}
