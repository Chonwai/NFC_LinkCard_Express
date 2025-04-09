import { IsString, IsOptional, IsBoolean, IsUrl, IsEmail, IsPhoneNumber } from 'class-validator';

export class CreateAssociationDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    slug?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    logo?: string;

    @IsOptional()
    @IsString()
    banner?: string;

    @IsOptional()
    @IsUrl()
    website?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsPhoneNumber()
    phone?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    socialLinks?: any;

    @IsOptional()
    customization?: any;

    @IsOptional()
    @IsBoolean()
    isPublic?: boolean = true;
}

export class UpdateAssociationDto extends CreateAssociationDto {}

export class CreateFullAssociationDto extends CreateAssociationDto {
    @IsString()
    name: string;
}
