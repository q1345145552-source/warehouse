import { IsString, IsNumber, IsOptional, IsIn, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class SaveRechargeDto {
  @IsString()
  customerId: string;

  @IsDateString()
  transactionDate: string;

  @IsString()
  @IsIn(['recharge', 'billing'])
  type: string;

  @IsString()
  @IsIn(['THB', 'CNY'])
  currency: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  exchangeRate?: number;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  refInvoiceId?: string;
}
