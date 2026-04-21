import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { InventoryService } from './inventory.service';
import { QueryAdminInventoryItemsDto } from './dto/query-admin-inventory-items.dto';
import { RejectInventoryItemDto } from './dto/reject-inventory-item.dto';
import { SaveInventoryItemDto } from './dto/save-inventory-item.dto';

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('inventory/items')
  @Roles('warehouse')
  getWarehouseInventoryItems(
    @CurrentUser() user: AuthUser,
    @Query('inventoryType') inventoryType?: 'product' | 'equipment' | 'other',
  ) {
    return this.inventoryService.getWarehouseInventoryItems(user, inventoryType);
  }

  @Post('inventory/items')
  @Roles('warehouse')
  createInventoryItem(@CurrentUser() user: AuthUser, @Body() dto: SaveInventoryItemDto) {
    return this.inventoryService.createInventoryItem(user, dto);
  }

  @Put('inventory/items/:id')
  @Roles('warehouse')
  updateInventoryItem(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SaveInventoryItemDto) {
    return this.inventoryService.updateInventoryItem(user, id, dto);
  }

  @Post('inventory/items/:id/submit')
  @Roles('warehouse')
  submitInventoryItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.inventoryService.submitInventoryItem(user, id);
  }

  @Get('admin/inventory/items')
  @Roles('admin')
  getAdminInventoryItems(@Query() query: QueryAdminInventoryItemsDto) {
    return this.inventoryService.getAdminInventoryItems(query);
  }

  @Post('admin/inventory/items/:id/approve')
  @Roles('admin')
  approveInventoryItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.inventoryService.approveInventoryItem(user, id);
  }

  @Post('admin/inventory/items/:id/reject')
  @Roles('admin')
  rejectInventoryItem(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RejectInventoryItemDto) {
    return this.inventoryService.rejectInventoryItem(user, id, dto);
  }
}
