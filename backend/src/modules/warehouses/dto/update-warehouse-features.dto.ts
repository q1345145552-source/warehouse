import { IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FeatureItemDto {
  @IsString()
  key: string;

  @IsBoolean()
  enabled: boolean;
}

export class UpdateWarehouseFeaturesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureItemDto)
  items: FeatureItemDto[];
}
