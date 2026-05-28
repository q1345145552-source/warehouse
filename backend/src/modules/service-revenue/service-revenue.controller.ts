import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/current-user.decorator';
import { ServiceRevenueService } from './service-revenue.service';
import { SaveServiceRevenueDto } from './dto/save-service-revenue.dto';
import { QueryServiceRevenueDto } from './dto/query-service-revenue.dto';

@Controller()
export class ServiceRevenueController {
  constructor(private readonly service: ServiceRevenueService) {}

  @Get('service-revenue')
  @Roles('warehouse', 'admin', 'finance')
  getRevenues(@Query() query: QueryServiceRevenueDto, @CurrentUser() user: AuthUser) {
    return this.service.getRevenues(query, user);
  }

  @Get('service-revenue/monthly/:month')
  @Roles('warehouse', 'admin', 'finance')
  getMonthlySummary(@Param('month') month: string, @CurrentUser() user: AuthUser) {
    return this.service.getMonthlySummary(month, user);
  }

  @Get('service-revenue/customer/:customerId')
  @Roles('warehouse', 'admin', 'finance')
  getCustomerReport(
    @Param('customerId') customerId: string,
    @Query('startMonth') startMonth?: string,
    @Query('endMonth') endMonth?: string,
  ) {
    return this.service.getCustomerMonthlyReport(customerId, startMonth, endMonth);
  }

  @Post('service-revenue')
  @Roles('warehouse', 'admin')
  saveRevenue(@Body() dto: SaveServiceRevenueDto, @CurrentUser() user: AuthUser) {
    return this.service.saveRevenue(dto, user);
  }

  @Delete('service-revenue/:id')
  @Roles('warehouse', 'admin')
  deleteRevenue(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.deleteRevenue(id, user);
  }
}
