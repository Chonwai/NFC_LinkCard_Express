import { IsString, IsOptional, MinLength, IsEmail, Matches } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    display_name?: string;

    @IsOptional()
    @IsString()
    bio?: string;
}

export class UpdatePasswordDto {
    @IsString()
    @MinLength(8)
    current_password: string;

    @IsString()
    @MinLength(8)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: '密碼必須包含至少一個大寫字母、一個小寫字母和一個數字或特殊字符',
    })
    new_password: string;

    @IsString()
    confirm_password: string;
}
