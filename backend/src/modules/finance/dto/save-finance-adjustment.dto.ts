import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SaveFinanceAdjustmentDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @IsIn(['increase', 'decrease'])
  adjustmentType: 'increase' | 'decrease';

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  currencyCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  fxRateToCny?: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
