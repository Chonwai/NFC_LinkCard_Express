import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEmail,
    IsArray,
    ValidateNested,
    ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePropertyInvitationDto {
    @IsEmail({}, { message: 'Please enter a valid email address for the invitee.' })
    @IsNotEmpty({ message: 'Email cannot be empty.' })
    email: string;

    @IsString({ message: 'Space ID must be a string.' })
    @IsNotEmpty({ message: 'Space ID cannot be empty.' })
    spaceId: string;

    @IsString({ message: 'LinkSpace User ID must be a string.' })
    @IsOptional()
    linkspaceUserId?: string; // Optional: if LinkSpace user already exists
}

export class AcceptPropertyInvitationDto {
    @IsString()
    @IsNotEmpty({ message: 'Invitation token cannot be empty.' })
    invitationToken: string;
}

export class CreateBulkPropertyInvitationsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePropertyInvitationDto)
    @ArrayMinSize(1, { message: 'Invitations array cannot be empty.' })
    invitations: CreatePropertyInvitationDto[];
}
