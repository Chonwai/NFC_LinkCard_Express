import { IsString, IsOptional, IsBoolean, IsObject, IsUUID } from 'class-validator';

// 🆕 基於Lead數據的Profile預填數據DTO
export class LeadProfilePrefillDataDto {
    // Lead基本信息
    firstName: string;
    lastName: string;
    organization?: string;
    email: string;
    phone?: string;

    // 推薦的Profile設置
    suggestedName: string; // firstName + lastName
    suggestedDescription?: string; // 基於organization生成

    // 購買上下文信息
    purchaseContext?: {
        associationName: string;
        membershipTier: string;
        purchaseDate: string;
    };
}

// 🆕 創建協會Profile（基於Lead預填）DTO
export class CreateAssociationProfileWithLeadDto {
    @IsString()
    name: string; // 用戶可修改的Profile名稱

    @IsString()
    @IsOptional()
    description?: string; // 用戶可修改的描述

    @IsBoolean()
    @IsOptional()
    isPublic?: boolean = true; // 是否公開

    @IsUUID()
    @IsOptional()
    leadId?: string; // 關聯的Lead ID（可選，如果不提供則根據orderId自動查找）

    @IsUUID()
    orderId: string; // 關聯的訂單ID（必需）

    @IsObject()
    @IsOptional()
    customization?: {
        associationBadge?: boolean;
        associationTheme?: boolean;
        associationBranding?: string;
        profileType?: string;
    };
}

// 🆕 Profile預填選項響應DTO
export class ProfilePrefillOptionsResponseDto {
    // 是否建議創建協會專屬Profile
    shouldCreateProfile: boolean;

    // 預填數據
    prefillData: LeadProfilePrefillDataDto;

    // 創建選項
    creationOptions: {
        skipCreation: {
            title: string;
            description: string;
            action: 'SKIP_PROFILE_CREATION';
        };
        createWithDefaults: {
            title: string;
            description: string;
            action: 'CREATE_WITH_DEFAULTS';
            previewData: {
                name: string;
                description: string;
            };
        };
        createCustom: {
            title: string;
            description: string;
            action: 'CREATE_CUSTOM';
            form: {
                defaultName: string;
                defaultDescription: string;
            };
        };
    };

    // 下一步動作
    nextStep: {
        action: 'SHOW_PROFILE_OPTIONS' | 'AUTO_CREATE' | 'REDIRECT_TO_DASHBOARD';
        url?: string;
    };
}

// 🆕 Profile創建響應DTO
export class ProfileCreationResponseDto {
    success: boolean;
    profile: {
        id: string;
        name: string;
        slug: string;
        description?: string;
        isPublic: boolean;
        url: string; // Profile的公開URL
    };
    badge?: {
        id: string;
        isVisible: boolean;
        displayMode: string;
    };
    links?: {
        id: string;
        title: string;
        url: string;
        type: string;
        platform: string | null;
        isActive: boolean;
        displayOrder: number;
        createdFrom: string;
    }[];
    summary?: {
        linksCreated: number;
        linkTypes: (string | null)[];
    };
    nextStep: {
        action: 'VIEW_PROFILE' | 'EDIT_PROFILE' | 'DASHBOARD';
        url: string;
    };
}
