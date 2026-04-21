import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateUserStatusDto {
  @IsIn(['active', 'disabled'])
  status: 'active' | 'disabled';

  @IsOptional()
  @IsBoolean()
  unlockNow?: boolean;
}
