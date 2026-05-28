import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { InventoryConsumableService } from './inventory-consumable.service';

@Controller()
export class InventoryConsumableController {
  constructor(private readonly service: InventoryConsumableService) {}

  @Get('inventory-consumables')
  @Roles('warehouse', 'admin', 'finance')
  getItems(@Query('warehouseId') warehouseId?: string) {
    return this.service.getItems(warehouseId);
  }

  @Get('inventory-consumables/:id/history')
  @Roles('warehouse', 'admin', 'finance')
  getItemHistory(@Param('id') id: string) {
    return this.service.getItemHistory(id);
  }

  @Get('inventory-consumables/monthly-cost/:month')
  @Roles('warehouse', 'admin', 'finance')
  getMonthlyCost(@Param('month') month: string, @Query('warehouseId') warehouseId?: string) {
    return this.service.getMonthlyCost(month, warehouseId);
  }

  @Post('inventory-consumables/transactions')
  @Roles('warehouse', 'admin')
  saveTransaction(@Body() body: any) {
    return this.service.saveTransaction(body);
  }
}
