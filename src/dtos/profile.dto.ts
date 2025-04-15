import { IsString, IsOptional, IsBoolean, IsObject, IsUrl } from 'class-validator';

export class CreateProfileDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    is_public?: boolean;

    @IsObject()
    @IsOptional()
    meta?: Record<string, any>;

    @IsObject()
    @IsOptional()
    appearance?: Record<string, any>;

    @IsString()
    @IsOptional()
    slug?: string;
}

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    is_public?: boolean;

    @IsOptional()
    @IsString()
    @IsUrl()
    avatar?: string;

    @IsOptional()
    @IsString()
    theme?: string;
}
