import { IsString, IsNumber, IsOptional, IsIn, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class SaveServiceRevenueDto {
  @IsString()
  customerId: string;

  @IsString()
  serviceMonth: string; // YYYY-MM

  @IsOptional()
  @IsDateString()
  serviceDate?: string;

  @IsString()
  @IsIn([
    '仓租费', '入库费', '出库费', '线下发货', '线下运费',
    '挪仓费', '贴标', '退货', '包材费', '卸货费', '其他',
  ])
  serviceType: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountThb: number;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  refOrderId?: string;
}
