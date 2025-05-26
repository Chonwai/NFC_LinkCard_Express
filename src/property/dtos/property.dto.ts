import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum, IsObject } from 'class-validator';
import { ResidentVerificationMethod } from '@prisma/client'; // Assuming prisma client is correctly set up

export class LinkPropertyWithCodeDto {
    @IsNotEmpty()
    @IsString()
    propertyManagementCompanyCode: string; // Code or ID for the PropertyManagementCompany, e.g., "LINK_API_PROVIDER"

    @IsNotEmpty()
    @IsString()
    propertyExternalId: string; // External ID of the property (e.g., building)

    @IsNotEmpty()
    @IsString()
    unitExternalId: string; // External ID of the unit (e.g., apartment)

    @IsNotEmpty()
    @IsString()
    uniqueCode: string;
}

// You might add more DTOs later for other linking methods or for fetching property info
export class PropertyResidentDto {
    @IsUUID()
    id: string;

    @IsUUID()
    userId: string;

    @IsUUID()
    propertyUnitId: string;

    unitNumber: string;

    propertyAddress: string; // Denormalized for easier display

    propertyName: string; // Denormalized for easier display

    @IsEnum(ResidentVerificationMethod)
    @IsOptional()
    verificationMethod?: ResidentVerificationMethod;

    @IsObject()
    @IsOptional()
    meta?: any;
}
