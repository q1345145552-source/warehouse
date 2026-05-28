import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { FixedAssetsService } from './fixed-assets.service';

@Controller()
export class FixedAssetsController {
  constructor(private readonly service: FixedAssetsService) {}

  @Get('fixed-assets')
  @Roles('warehouse', 'admin', 'finance')
  getAssets(@Query('warehouseId') warehouseId?: string) {
    return this.service.getAssets(warehouseId);
  }

  @Get('fixed-assets/monthly-expense/:month')
  @Roles('warehouse', 'admin', 'finance')
  getMonthlyExpense(@Query('month') month: string, @Query('warehouseId') warehouseId?: string) {
    return this.service.getMonthlyExpense(month, warehouseId);
  }

  @Post('fixed-assets')
  @Roles('warehouse', 'admin')
  saveAsset(@Body() body: any) {
    return this.service.saveAsset(body);
  }
}
