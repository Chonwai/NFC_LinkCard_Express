import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
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

export class ForgotPasswordDto {
    @IsEmail({}, { message: '請輸入有效的電子郵件地址' })
    email: string;
}

export class ResetPasswordDto {
    @IsString()
    token: string;

    @MinLength(8, { message: '密碼長度至少為8個字符' })
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: '密碼必須包含至少一個大寫字母、一個小寫字母和一個數字或特殊字符',
    })
    newPassword: string;
}

export class InitialRegisterDto {
    @IsEmail({}, { message: 'Please enter a valid email address' })
    email: string;

    @IsString({ message: 'Username must be a string' })
    @MinLength(3, { message: 'Username must be at least 3 characters long' })
    username: string;

    @IsString({ message: 'Password must be a string' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message:
            'Password must contain at least one uppercase letter, one lowercase letter, and one number or special character',
    })
    password: string;
}

export class VerifyEmailDto {
    @IsString({ message: 'Verification token must be a string' })
    token: string;
}
