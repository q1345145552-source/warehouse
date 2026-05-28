import { IsOptional, IsString, IsIn, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SaveCustomerDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  customerId: string;

  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  @IsIn(['prepaid', 'postpaid'])
  customerType?: string;

  @IsOptional()
  @IsString()
  @IsIn(['THB', 'CNY'])
  currencyPreference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  exchangeRate?: number;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  wechatId?: string;
}
