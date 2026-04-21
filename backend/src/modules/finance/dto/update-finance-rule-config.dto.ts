import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

class FinanceAllocationRuleDetailDto {
  @IsString()
  @IsIn(['expense', 'purchase'])
  targetType: 'expense' | 'purchase';

  @IsString()
  @IsIn(['fixed_ratio', 'income_proportion'])
  method: 'fixed_ratio' | 'income_proportion';

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  ratioValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priority?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateFinanceRuleConfigDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  sharedExpenseRate: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  purchaseCostRate: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeAdjustmentsInSnapshot?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinanceAllocationRuleDetailDto)
  allocationDetails?: FinanceAllocationRuleDetailDto[];
}
