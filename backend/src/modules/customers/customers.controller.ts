import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/current-user.decorator';
import { CustomersService } from './customers.service';
import { SaveCustomerDto } from './dto/save-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';

@Controller()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('customers')
  @Roles('warehouse', 'admin', 'finance')
  getCustomers(@Query() query: QueryCustomersDto, @CurrentUser() user: AuthUser) {
    return this.customersService.getCustomers(query, user);
  }

  @Get('customers/:id')
  @Roles('warehouse', 'admin', 'finance')
  getCustomerDetail(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.customersService.getCustomerDetail(id, user);
  }

  @Post('customers')
  @Roles('warehouse', 'admin')
  saveCustomer(@Body() dto: SaveCustomerDto, @CurrentUser() user: AuthUser) {
    return this.customersService.saveCustomer(dto, user);
  }

  @Put('customers/:id')
  @Roles('warehouse', 'admin')
  updateCustomer(@Param('id') id: string, @Body() dto: SaveCustomerDto, @CurrentUser() user: AuthUser) {
    return this.customersService.saveCustomer({ ...dto, id }, user);
  }

  @Put('customers/:id/status')
  @Roles('warehouse', 'admin')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }, @CurrentUser() user: AuthUser) {
    return this.customersService.updateStatus(id, body.status, user);
  }
}
