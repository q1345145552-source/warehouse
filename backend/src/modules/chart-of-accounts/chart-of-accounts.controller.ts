import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { ChartOfAccountsService } from './chart-of-accounts.service';

@Controller()
export class ChartOfAccountsController {
  constructor(private readonly service: ChartOfAccountsService) {}

  @Get('chart-of-accounts')
  @Roles('warehouse', 'admin', 'finance')
  getAccounts(@Query('category') category?: string) {
    return this.service.getAccounts(category);
  }

  @Get('chart-of-accounts/tree')
  @Roles('warehouse', 'admin', 'finance')
  getAccountTree() {
    return this.service.getAccountTree();
  }

  @Post('chart-of-accounts')
  @Roles('admin')
  saveAccount(@Body() body: any) {
    return this.service.saveAccount(body);
  }
}
