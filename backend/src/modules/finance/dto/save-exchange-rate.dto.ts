import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SaveExchangeRateDto {
  @IsString()
  @IsNotEmpty()
  baseCurrency: string;

  @IsOptional()
  @IsString()
  quoteCurrency?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  rateValue: number;

  @IsDateString()
  effectiveDate: string;
}
