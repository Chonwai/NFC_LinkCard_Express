import { IsString, IsOptional, IsEmail, IsPhoneNumber, IsBoolean, IsObject } from 'class-validator';

export class CreateLeadDto {
    @IsString()
    first_name: string;

    @IsString()
    last_name: string;

    @IsEmail()
    email: string;

    @IsPhoneNumber()
    @IsOptional()
    phone_number?: string;

    @IsString()
    @IsOptional()
    company?: string;

    @IsString()
    @IsOptional()
    job_title?: string;

    @IsString()
    @IsOptional()
    note?: string;
}

export class UpdateLeadCaptureSettingsDto {
    @IsBoolean()
    enabled: boolean;

    @IsObject()
    fields: {
        first_name: boolean;
        last_name: boolean;
        email: boolean;
        phone_number: boolean;
        company: boolean;
        job_title: boolean;
        note: boolean;
    };
}
