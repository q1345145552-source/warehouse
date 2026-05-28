import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/current-user.decorator';
import { BankAccountsService } from './bank-accounts.service';
import { SaveBankTransactionDto } from './dto/save-bank-transaction.dto';
import { QueryBankTransactionsDto } from './dto/query-bank-transactions.dto';

@Controller()
export class BankAccountsController {
  constructor(private readonly service: BankAccountsService) {}

  @Get('bank-accounts')
  @Roles('warehouse', 'admin', 'finance')
  getAccounts(@CurrentUser() user: AuthUser) {
    return this.service.getAccounts(user);
  }

  @Get('bank-accounts/transactions')
  @Roles('warehouse', 'admin', 'finance')
  getTransactions(@Query() query: QueryBankTransactionsDto, @CurrentUser() user: AuthUser) {
    return this.service.getTransactions(query, user);
  }

  @Get('bank-accounts/monthly/:month')
  @Roles('warehouse', 'admin', 'finance')
  getMonthlySummary(@Param('month') month: string, @CurrentUser() user: AuthUser) {
    return this.service.getMonthlySummary(month, user);
  }

  @Post('bank-accounts/transactions')
  @Roles('warehouse', 'admin')
  saveTransaction(@Body() dto: SaveBankTransactionDto, @CurrentUser() user: AuthUser) {
    return this.service.saveTransaction(dto, user);
  }
}
