import {
    IsString,
    IsEmail,
    IsOptional,
    IsNotEmpty,
    MinLength,
    ValidateNested,
    IsUUID,
    Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseContextDto } from '../../association/dtos/lead.dto';

// 🆕 Lead信息DTO（用於註冊流程）
export class LeadInfoDto {
    @IsNotEmpty({ message: '名字不能為空' })
    @IsString()
    @Length(1, 100, { message: '名字長度需在1-100字符之間' })
    firstName: string;

    @IsNotEmpty({ message: '姓氏不能為空' })
    @IsString()
    @Length(1, 100, { message: '姓氏長度需在1-100字符之間' })
    lastName: string;

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

// 🆕 用戶註冊信息DTO（簡化版，用於組合）
export class UserRegistrationDto {
    @IsString()
    @MinLength(3, { message: '用戶名至少需要3個字符' })
    username: string;

    @IsEmail({}, { message: '請輸入有效的電子郵件地址' })
    email: string;

    @IsString()
    @MinLength(8, { message: '密碼至少需要8個字符' })
    password: string;

    @IsOptional()
    @IsString()
    display_name?: string;
}

// 🆕 註冊+Lead收集組合DTO
export class RegisterWithLeadDto {
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => UserRegistrationDto)
    user: UserRegistrationDto;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => LeadInfoDto)
    lead: LeadInfoDto;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => PurchaseContextDto)
    purchaseContext: PurchaseContextDto;
}

// 🆕 註冊+Lead收集響應DTO
export class RegisterWithLeadResponseDto {
    user: {
        id: string;
        username: string;
        email: string;
        isVerified: boolean;
        displayName?: string;
    };

    lead: {
        id: string;
        source: string;
        status: string;
        priority: string;
    };

    token: string;

    nextStep: {
        action: 'PROCEED_TO_PAYMENT';
        checkoutUrl?: string;
        orderId?: string;
    };
}

// 🆕 購買意向創建訂單DTO
export class CreatePurchaseOrderWithLeadDto {
    @IsNotEmpty()
    @IsUUID()
    pricingPlanId: string;

    @IsOptional()
    @IsUUID()
    leadId?: string;

    @IsOptional()
    @IsString()
    successUrl?: string;

    @IsOptional()
    @IsString()
    cancelUrl?: string;
}
