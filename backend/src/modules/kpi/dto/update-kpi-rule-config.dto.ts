import { IsNumber, Min } from 'class-validator';

export class UpdateKpiRuleConfigDto {
  @IsNumber()
  @Min(0)
  businessCeiling: number;

  @IsNumber()
  @Min(0.01)
  businessDivisor: number;

  @IsNumber()
  @Min(0)
  errorCeiling: number;

  @IsNumber()
  @Min(0)
  errorPenalty: number;

  @IsNumber()
  @Min(0)
  efficiencyCeiling: number;

  @IsNumber()
  @Min(0.01)
  efficiencyDivisor: number;

  @IsNumber()
  @Min(0)
  loadCeiling: number;

  @IsNumber()
  @Min(0.01)
  loadMultiplier: number;

  @IsNumber()
  @Min(0)
  excellentMin: number;

  @IsNumber()
  @Min(0)
  goodMin: number;

  @IsNumber()
  @Min(0)
  passMin: number;

  @IsNumber()
  @Min(0)
  improveMin: number;
}
