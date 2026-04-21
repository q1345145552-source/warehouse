import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class SaveFinanceRecordDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsDateString()
  recordDate: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsIn(['income', 'expense', 'purchase'])
  recordType: 'income' | 'expense' | 'purchase';

  @IsString()
  @IsIn([
    'balance_sheet',
    'profit_statement',
    'operation_monitor',
    'fixed_assets',
    'business_income',
    'consumables',
    'topup_details',
  ])
  targetModule:
    | 'balance_sheet'
    | 'profit_statement'
    | 'operation_monitor'
    | 'fixed_assets'
    | 'business_income'
    | 'consumables'
    | 'topup_details';

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  currencyCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  fxRateToCny?: number;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  counterparty?: string;

  @IsOptional()
  @IsString()
  costNature?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsObject()
  moduleData?: Record<string, unknown>;
}
