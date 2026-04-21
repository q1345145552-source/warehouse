import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SubmitProductInquiryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsString()
  @IsNotEmpty()
  note: string;

  @IsString()
  @IsNotEmpty()
  contactName: string;

  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high'])
  urgency?: 'low' | 'medium' | 'high';
}
