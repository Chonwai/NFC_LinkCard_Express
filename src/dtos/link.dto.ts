import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum } from 'class-validator';
import { LinkType, LinkPlatform } from '@prisma/client';
import { IsValidLinkUrl } from '../validators/link-url.validator';

export class CreateLinkDto {
    @IsString()
    title: string;

    @IsValidLinkUrl({
        message: 'URL 格式不正確，請確保符合所選平台的標準格式',
    })
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
    type: LinkType;

    @IsEnum(LinkPlatform)
    @IsOptional()
    platform?: LinkPlatform;
}

export class UpdateLinkDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsValidLinkUrl({
        message: 'URL 格式不正確，請確保符合所選平台的標準格式',
    })
    url?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @IsOptional()
    @IsString()
    icon?: string;

    @IsOptional()
    @IsEnum(LinkType)
    type?: LinkType;

    @IsOptional()
    @IsEnum(LinkPlatform)
    platform?: LinkPlatform;

    @IsOptional()
    @IsNumber()
    display_order?: number;
}

export class ReorderLinkDto {
    @IsString()
    id: string;

    @IsNumber()
    display_order: number;
}
