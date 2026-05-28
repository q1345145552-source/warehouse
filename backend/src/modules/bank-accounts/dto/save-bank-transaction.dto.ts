import { IsString, IsNumber, IsOptional, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class SaveBankTransactionDto {
  @IsString()
  bankAccountId: string;

  @IsOptional()
  @IsString()
  subAccount?: string;

  @IsDateString()
  transactionDate: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsString()
  description: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  incomeThb?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  incomeCny?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  expenseThb?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  expenseCny?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}
