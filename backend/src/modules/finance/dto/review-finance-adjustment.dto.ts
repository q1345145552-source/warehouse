import { IsOptional, IsString } from 'class-validator';

export class ReviewFinanceAdjustmentDto {
  @IsOptional()
  @IsString()
  reviewNote?: string;
}
