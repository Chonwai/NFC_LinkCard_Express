import { IsString, IsOptional, IsBoolean, IsNumber, IsUrl, IsEnum } from 'class-validator';
import { LinkType } from '@prisma/client';

export class CreateLinkDto {
    @IsString()
    title: string;

    @IsUrl()
    url: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsString()
    @IsOptional()
    icon?: string;

    @IsString()
    profile_id: string;

    @IsNumber()
    @IsOptional()
    display_order?: number;

    @IsEnum(LinkType)
    @IsOptional()
    type?: LinkType;

    @IsString()
    @IsOptional()
    platform?: string;
}

export class UpdateLinkDto extends CreateLinkDto {
    @IsString()
    @IsOptional()
    profile_id: string;
}

export class ReorderLinkDto {
    @IsString()
    id: string;

    @IsNumber()
    display_order: number;
}
