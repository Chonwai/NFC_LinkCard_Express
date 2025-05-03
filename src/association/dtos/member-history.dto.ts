import { IsString, IsEnum, IsOptional } from 'class-validator';
import { MembershipStatus } from '../types/enums';

export class CreateMemberHistoryDto {
    @IsString()
    association_member_id: string;

    @IsEnum(MembershipStatus)
    previous_status: MembershipStatus;

    @IsEnum(MembershipStatus)
    new_status: MembershipStatus;

    @IsString()
    changed_by: string;

    @IsOptional()
    @IsString()
    reason?: string;
}
