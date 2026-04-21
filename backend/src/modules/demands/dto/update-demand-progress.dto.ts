import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateDemandProgressDto {
  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsNotEmpty()
  note: string;
}
