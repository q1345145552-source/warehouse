import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SaveKpiEntryDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  staffCode?: string;

  @IsString()
  @IsIn(['warehouse', 'personal'])
  targetType: 'warehouse' | 'personal';

  @IsString()
  @IsIn(['daily', 'weekly', 'monthly'])
  cycleType: 'daily' | 'weekly' | 'monthly';

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(0)
  orderCount: number;

  @IsNumber()
  @Min(0)
  warehouseArea: number;

  @IsNumber()
  @Min(0)
  staffCount: number;

  @IsNumber()
  @Min(0)
  errorCount: number;

  @IsNumber()
  @Min(0)
  inboundCount: number;

  @IsOptional()
  @IsString()
  note?: string;
}
