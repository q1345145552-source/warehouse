import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class PublishKpiRuleDto {
  @IsString()
  @IsNotEmpty()
  versionName: string;

  @IsDateString()
  effectiveStartAt: string;
}
