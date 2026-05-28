import { IsOptional, IsString, IsIn } from 'class-validator';

export class QueryRechargeDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['recharge', 'billing', ''])
  type?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
