import { IsNotEmpty, IsString } from 'class-validator';

export class RejectInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}
