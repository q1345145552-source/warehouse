import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateUserRoleDto {
  @IsIn(['warehouse', 'admin'])
  role: 'warehouse' | 'admin';

  @IsOptional()
  @IsString()
  warehouseId?: string;
}
