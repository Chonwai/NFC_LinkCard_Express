import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';

export enum AffiliationStatus {
    APPROVED = 'ACTIVE',
    REJECTED = 'INACTIVE',
    PENDING = 'PENDING',
}

export enum AffiliationDisplayMode {
    FULL = 'FULL', // 顯示完整信息
    BADGE_ONLY = 'BADGE_ONLY', // 僅顯示徽章
    HIDDEN = 'HIDDEN', // 不顯示
}

export class CreateAffiliationDto {
    @IsString()
    userId: string;

    @IsOptional()
    @IsString()
    message?: string;

    @IsOptional()
    @IsBoolean()
    displayInUserProfile?: boolean = true;
}

export class UpdateAffiliationDto {
    @IsOptional()
    @IsEnum(AffiliationStatus)
    status?: AffiliationStatus;

    @IsOptional()
    @IsEnum(AffiliationDisplayMode)
    displayMode?: AffiliationDisplayMode;

    @IsOptional()
    @IsString()
    position?: string;

    @IsOptional()
    @IsBoolean()
    displayInUserProfile?: boolean;
}
