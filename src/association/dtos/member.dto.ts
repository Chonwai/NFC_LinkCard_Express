import { IsString, IsEnum, IsOptional, IsBoolean, IsDate } from 'class-validator';
import { MemberRole, MembershipTier, MembershipStatus } from '../types/enums';

export class AddMemberDto {
    @IsString()
    userId: string;

    @IsOptional()
    @IsEnum(MemberRole)
    role?: MemberRole = MemberRole.MEMBER;

    @IsOptional()
    @IsEnum(MembershipTier)
    membershipTier?: MembershipTier = MembershipTier.BASIC;

    @IsOptional()
    @IsEnum(MembershipStatus)
    membershipStatus?: MembershipStatus = MembershipStatus.PENDING;

    @IsOptional()
    @IsBoolean()
    displayInDirectory?: boolean = true;

    @IsOptional()
    @IsString()
    position?: string;

    @IsOptional()
    @IsDate()
    renewalDate?: Date;
}

export class UpdateMemberDto {
    @IsOptional()
    @IsEnum(MemberRole)
    role?: MemberRole;

    @IsOptional()
    @IsEnum(MembershipTier)
    membershipTier?: MembershipTier;

    @IsOptional()
    @IsEnum(MembershipStatus)
    membershipStatus?: MembershipStatus;

    @IsOptional()
    @IsBoolean()
    displayInDirectory?: boolean;

    @IsOptional()
    @IsString()
    position?: string;

    @IsOptional()
    @IsDate()
    renewalDate?: Date;
}
