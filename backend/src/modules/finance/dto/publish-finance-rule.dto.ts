import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';

export class PublishFinanceRuleDto {
  @IsString()
  @IsNotEmpty()
  versionName: string;

  @IsISO8601()
  effectiveStartAt: string;
}
