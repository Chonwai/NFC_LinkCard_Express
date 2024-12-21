import { IsEmail, IsString, MinLength } from 'class-validator';
import { Prisma } from '@prisma/client';

export class RegisterDto implements Prisma.UserCreateInput {
    @IsString()
    @MinLength(3)
    username: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;

    display_name?: string;
    avatar?: string;
    bio?: string;
}

export class LoginDto {
    @IsEmail()
    email: string;

    @IsString()
    password: string;
}
