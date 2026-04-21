import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  warehouseName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  cityName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  countryCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaSize?: number;
}
