import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryAdminInventoryItemsDto {
  @IsOptional()
  @IsString()
  @IsIn(['product', 'equipment', 'other'])
  inventoryType?: 'product' | 'equipment' | 'other';

  @IsOptional()
  @IsString()
  @IsIn(['draft', 'submitted', 'approved', 'rejected'])
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
}
