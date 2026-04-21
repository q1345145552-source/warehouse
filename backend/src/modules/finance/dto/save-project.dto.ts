import { IsIn, IsOptional, IsString } from 'class-validator';

export class SaveProjectDto {
  @IsString()
  warehouseId: string;

  @IsString()
  projectName: string;

  @IsOptional()
  @IsString()
  projectCode?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsString()
  @IsIn(['draft', 'active', 'closed'])
  status: 'draft' | 'active' | 'closed';
}
