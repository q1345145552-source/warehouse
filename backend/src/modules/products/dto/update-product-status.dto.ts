import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class UpdateProductStatusDto {
  @IsString()
  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';

  @IsOptional()
  @IsISO8601()
  listedAt?: string;

  @IsOptional()
  @IsISO8601()
  unlistedAt?: string;
}
