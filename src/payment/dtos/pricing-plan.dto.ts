import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsDecimal, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { MembershipTier } from '@prisma/client';

/**
 * 創建定價方案 DTO
 */
export class CreatePricingPlanDto {
    @IsString()
    name: string;

    @IsString()
    displayName: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsEnum(MembershipTier)
    membershipTier: MembershipTier;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Transform(({ value }) => parseFloat(value))
    price: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsString()
    billingCycle?: string;
}

/**
 * 更新定價方案 DTO
 */
export class UpdatePricingPlanDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    displayName?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Transform(({ value }) => parseFloat(value))
    price?: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsString()
    billingCycle?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

/**
 * 定價方案響應 DTO
 */
export class PricingPlanResponseDto {
    id: string;
    associationId: string;
    name: string;
    displayName: string;
    description?: string;
    membershipTier: MembershipTier;
    price: string; // Decimal 作為字符串返回
    currency: string;
    billingCycle: string;
    stripeProductId?: string;
    stripePriceId?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
