import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/current-user.decorator';
import { RechargeService } from './recharge.service';
import { SaveRechargeDto } from './dto/save-recharge.dto';
import { QueryRechargeDto } from './dto/query-recharge.dto';

@Controller()
export class RechargeController {
  constructor(private readonly rechargeService: RechargeService) {}

  @Get('recharge/transactions')
  @Roles('warehouse', 'admin', 'finance')
  getTransactions(@Query() query: QueryRechargeDto, @CurrentUser() user: AuthUser) {
    return this.rechargeService.getTransactions(query, user);
  }

  @Get('recharge/balance/:customerId')
  @Roles('warehouse', 'admin', 'finance')
  getCustomerBalance(@Param('customerId') customerId: string) {
    return this.rechargeService.getCustomerBalance(customerId);
  }

  @Post('recharge/transactions')
  @Roles('warehouse', 'admin')
  saveTransaction(@Body() dto: SaveRechargeDto, @CurrentUser() user: AuthUser) {
    return this.rechargeService.saveTransaction(dto, user);
  }
}
