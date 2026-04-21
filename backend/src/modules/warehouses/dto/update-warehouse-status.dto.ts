import { IsIn, IsString } from 'class-validator';

export class UpdateWarehouseStatusDto {
  @IsString()
  @IsIn(['enabled', 'disabled'])
  status: 'enabled' | 'disabled';
}
