import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
} from 'class-validator';
import { BadgeDisplayMode } from '@prisma/client';

/**
 * 創建個人檔案徽章的數據傳輸對象
 * 用於在建立協會徽章時驗證和傳遞數據
 */
export class CreateProfileBadgeDto {
    @IsNotEmpty()
    @IsUUID()
    profileId: string;

    @IsNotEmpty()
    @IsUUID()
    associationId: string;

    @IsNotEmpty()
    @IsUUID()
    userId: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    displayOrder?: number = 0;

    @IsOptional()
    @IsBoolean()
    isVisible?: boolean = true;

    @IsOptional()
    @IsString()
    customLabel?: string;

    @IsOptional()
    @IsString()
    customColor?: string;

    @IsOptional()
    @IsString()
    customSize?: string;

    @IsEnum(BadgeDisplayMode)
    @IsOptional()
    displayMode?: BadgeDisplayMode = BadgeDisplayMode.FULL;
}

/**
 * 更新個人檔案徽章的數據傳輸對象
 * 用於在更新已有徽章時驗證和傳遞數據
 */
export class UpdateProfileBadgeDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    displayOrder?: number;

    @IsOptional()
    @IsBoolean()
    isVisible?: boolean;

    @IsOptional()
    @IsString()
    customLabel?: string;

    @IsOptional()
    @IsString()
    customColor?: string;

    @IsOptional()
    @IsString()
    customSize?: string;

    @IsEnum(BadgeDisplayMode)
    @IsOptional()
    displayMode?: BadgeDisplayMode;
}

/**
 * 個人檔案徽章響應數據傳輸對象
 * 用於向客戶端返回徽章數據
 */
export interface ProfileBadgeResponseDto {
    id: string;
    profileId: string;
    associationId: string;
    associationName: string;
    associationSlug: string;
    associationLogo?: string;
    displayOrder: number;
    isVisible: boolean;
    customLabel?: string;
    customColor?: string;
    customSize?: string;
    displayMode: BadgeDisplayMode;
    createdAt: Date;
    updatedAt: Date;
}
