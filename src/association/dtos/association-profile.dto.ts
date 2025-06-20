import { IsString, IsOptional, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CustomizationDto {
    @IsBoolean()
    @IsOptional()
    associationBadge?: boolean = true;

    @IsBoolean()
    @IsOptional()
    associationTheme?: boolean = true;

    @IsString()
    @IsOptional()
    associationBranding?: string;

    @IsString()
    @IsOptional()
    profileType?: string = 'ASSOCIATION_MEMBER';
}

export class CreateAssociationProfileDto {
    @IsString()
    @IsOptional()
    name?: string; // 可選，允許用戶自定義名稱，否則後端生成默認名稱

    @IsString()
    @IsOptional()
    description?: string; // 可選

    @IsBoolean()
    @IsOptional()
    isPublic?: boolean = true; // 默認公開

    @IsObject()
    @IsOptional()
    @ValidateNested()
    @Type(() => CustomizationDto)
    customization?: CustomizationDto;
}
