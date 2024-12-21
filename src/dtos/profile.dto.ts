import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

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
}

export class UpdateProfileDto extends CreateProfileDto {
    @IsString()
    name: string;
}
