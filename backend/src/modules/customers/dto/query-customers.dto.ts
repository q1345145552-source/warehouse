import { IsOptional, IsString, IsIn } from 'class-validator';

export class QueryCustomersDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', ''])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['prepaid', 'postpaid', ''])
  customerType?: string;
}
