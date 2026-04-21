import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryAdminWarehousesDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled';

  @IsOptional()
  @IsString()
  featureKey?: string;
}
