import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/current-user.decorator';
import { WarehousesService } from './warehouses.service';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { UpdateWarehouseFeaturesDto } from './dto/update-warehouse-features.dto';
import { UpdateWarehouseStatusDto } from './dto/update-warehouse-status.dto';
import { QueryAdminWarehousesDto } from './dto/query-admin-warehouses.dto';
import { BatchUpdateWarehouseStatusDto } from './dto/batch-update-warehouse-status.dto';
import { BatchUpdateWarehouseFeaturesDto } from './dto/batch-update-warehouse-features.dto';

@Controller()
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get('warehouses/current')
  @Roles('warehouse', 'admin')
  getCurrentWarehouse(@CurrentUser() user: AuthUser) {
    return this.warehousesService.getCurrentWarehouse(user);
  }

  @Put('warehouses/current')
  @Roles('warehouse')
  updateCurrentWarehouse(@CurrentUser() user: AuthUser, @Body() dto: UpdateWarehouseDto) {
    return this.warehousesService.updateCurrentWarehouse(dto, user);
  }

  @Get('admin/warehouses')
  @Roles('admin')
  getWarehouses(@Query() query: QueryAdminWarehousesDto) {
    return this.warehousesService.getWarehouses(query);
  }

  @Get('admin/warehouses/:warehouseId')
  @Roles('admin')
  getWarehouseDetail(@Param('warehouseId') warehouseId: string) {
    return this.warehousesService.getWarehouseDetail(warehouseId);
  }

  @Put('admin/warehouses/:warehouseId/status')
  @Roles('admin')
  updateWarehouseStatus(
    @Param('warehouseId') warehouseId: string,
    @Body() dto: UpdateWarehouseStatusDto,
  ) {
    return this.warehousesService.updateWarehouseStatus(warehouseId, dto);
  }

  @Put('admin/warehouses/:warehouseId/features')
  @Roles('admin')
  updateWarehouseFeatures(
    @Param('warehouseId') warehouseId: string,
    @Body() dto: UpdateWarehouseFeaturesDto,
  ) {
    return this.warehousesService.updateWarehouseFeatures(warehouseId, dto);
  }

  @Put('admin/warehouses/batch/status')
  @Roles('admin')
  batchUpdateWarehouseStatus(@Body() dto: BatchUpdateWarehouseStatusDto) {
    return this.warehousesService.batchUpdateWarehouseStatus(dto);
  }

  @Put('admin/warehouses/batch/features')
  @Roles('admin')
  batchUpdateWarehouseFeatures(@Body() dto: BatchUpdateWarehouseFeaturesDto) {
    return this.warehousesService.batchUpdateWarehouseFeatures(dto);
  }
}
