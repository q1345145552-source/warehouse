import { IsOptional, IsString, IsIn } from 'class-validator';

export class QueryServiceRevenueDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  serviceMonth?: string; // YYYY-MM

  @IsOptional()
  @IsString()
  @IsIn([
    '仓租费', '入库费', '出库费', '线下发货', '线下运费',
    '挪仓费', '贴标', '退货', '包材费', '卸货费', '其他', '',
  ])
  serviceType?: string;

  @IsOptional()
  @IsString()
  startMonth?: string;

  @IsOptional()
  @IsString()
  endMonth?: string;
}
