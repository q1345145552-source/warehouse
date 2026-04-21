import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsString } from 'class-validator';

export class BatchUpdateWarehouseStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => String)
  @IsString({ each: true })
  warehouseIds: string[];

  @IsString()
  @IsIn(['enabled', 'disabled'])
  status: 'enabled' | 'disabled';
}
