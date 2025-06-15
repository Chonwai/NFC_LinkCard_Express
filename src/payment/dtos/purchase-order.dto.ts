import { IsString, IsOptional, IsNumber, IsDateString, IsObject, Min } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * 創建購買訂單 DTO
 */
export class CreatePurchaseOrderDto {
    @IsString()
    pricingPlanId: string;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsString()
    successUrl?: string;

    @IsOptional()
    @IsString()
    cancelUrl?: string;
}

/**
 * 更新購買訂單 DTO
 */
export class UpdatePurchaseOrderDto {
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsObject()
    stripeData?: Record<string, any>;

    @IsOptional()
    @IsDateString()
    membershipStartDate?: string;

    @IsOptional()
    @IsDateString()
    membershipEndDate?: string;

    @IsOptional()
    @IsDateString()
    paidAt?: string;
}

/**
 * 購買訂單響應 DTO
 */
export class PurchaseOrderResponseDto {
    id: string;
    associationId: string;
    userId: string;
    pricingPlanId: string;
    orderNumber: string;
    amount: string; // Decimal 作為字符串返回
    currency: string;
    status: string;
    stripeData?: Record<string, any>;
    membershipStartDate?: Date;
    membershipEndDate?: Date;
    createdAt: Date;
    updatedAt: Date;
    paidAt?: Date;

    // 關聯數據
    pricingPlan?: {
        id: string;
        name: string;
        displayName: string;
        membershipTier: string;
    };

    user?: {
        id: string;
        email: string;
        username: string;
        displayName?: string;
    };
}

/**
 * Stripe Checkout Session 創建 DTO
 */
export class CreateCheckoutSessionDto {
    @IsString()
    pricingPlanId: string;

    @IsOptional()
    @IsString()
    successUrl?: string;

    @IsOptional()
    @IsString()
    cancelUrl?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, string>;
}
