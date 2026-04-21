import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';

class BatchFeatureItemDto {
  @IsString()
  key: string;

  @IsBoolean()
  enabled: boolean;
}

export class BatchUpdateWarehouseFeaturesDto {
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => String)
  @IsString({ each: true })
  warehouseIds: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchFeatureItemDto)
  items: BatchFeatureItemDto[];
}
