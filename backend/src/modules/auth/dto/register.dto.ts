import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: '账号不能为空' })
  @Matches(/^[a-zA-Z0-9_]{3,30}$/, { message: '账号只能包含字母、数字和下划线，长度 3-30 位' })
  account: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(8, { message: '密码长度不能少于 8 位' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, { message: '密码必须包含字母和数字' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: '确认密码不能为空' })
  confirmPassword: string;

  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  @IsIn(['warehouse', 'admin'], { message: '角色只能是仓库端或管理员' })
  role: 'warehouse' | 'admin';

  @IsOptional()
  @IsString()
  @ValidateIf((_, value) => value !== '')
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '公司名称不能超过 100 个字符' })
  companyName?: string;
}
