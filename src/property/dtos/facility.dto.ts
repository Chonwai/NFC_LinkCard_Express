import { IsString, IsNotEmpty, IsUUID, IsOptional, IsEnum } from 'class-validator';

// Define an enum for access methods if you want strict typing,
// or use string and validate in service layer
export enum FacilityAccessMethod {
    QR = 'QR',
    NFC = 'NFC',
}

export class RequestFacilityAccessDto {
    @IsNotEmpty()
    @IsUUID()
    facilityId: string;

    @IsNotEmpty()
    @IsEnum(FacilityAccessMethod)
    accessMethod: FacilityAccessMethod; // e.g., "QR" or "NFC"
}

export class FacilityAccessCredentialDto {
    @IsNotEmpty()
    @IsString()
    credentialType: string; // "QR_CODE" or "NFC_DATA"

    @IsNotEmpty()
    @IsString()
    data: string; // QR code string or NFC payload

    @IsNotEmpty()
    @IsString() // Or IsDateString if you prefer
    expiresAt: string; // ISO Date string

    @IsOptional()
    @IsString()
    facilityName?: string;
}
