import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SaveDemandDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsString()
  @IsNotEmpty()
  demandType: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsIn(['low', 'medium', 'high'])
  urgency: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsString()
  contactName?: string;
}
