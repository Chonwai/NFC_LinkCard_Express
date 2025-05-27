import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

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
