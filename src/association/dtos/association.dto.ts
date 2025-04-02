import { IsString, IsOptional, IsBoolean, IsUrl, IsEmail, IsPhoneNumber } from 'class-validator';

export class CreateAssociationDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    logo?: string;

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
