import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  account: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsIn(['warehouse', 'admin'])
  role: 'warehouse' | 'admin';
}
