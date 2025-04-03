import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
} from 'class-validator';

export class CreateProfileBadgeDto {
    @IsNotEmpty()
    @IsUUID()
    profileId: string;

    @IsNotEmpty()
    @IsUUID()
    associationId: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    displayOrder?: number = 0;

    @IsOptional()
    @IsBoolean()
    isVisible?: boolean = true;

    @IsOptional()
    @IsString()
    customLabel?: string;

    @IsOptional()
    @IsString()
    customColor?: string;

    @IsOptional()
    @IsString()
    customSize?: string;
}

export class UpdateProfileBadgeDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    displayOrder?: number;

    @IsOptional()
    @IsBoolean()
    isVisible?: boolean;

    @IsOptional()
    @IsString()
    customLabel?: string;

    @IsOptional()
    @IsString()
    customColor?: string;

    @IsOptional()
    @IsString()
    customSize?: string;
}

export class ProfileBadgeResponseDto {
    id: string;
    profileId: string;
    associationId: string;
    associationName: string;
    associationLogo?: string;
    displayOrder: number;
    isVisible: boolean;
    customLabel?: string;
    customColor?: string;
    customSize?: string;
    createdAt: Date;
    updatedAt: Date;
}
