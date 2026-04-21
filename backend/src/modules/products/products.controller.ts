import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthUser } from '../../common/auth/current-user.decorator';
import { SaveProductDto } from './dto/save-product.dto';
import { SubmitProductInquiryDto } from './dto/submit-product-inquiry.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { ProductsService } from './products.service';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('products')
  @Roles('warehouse', 'admin')
  getProducts(@Query() query: QueryProductsDto) {
    return this.productsService.getProducts(query);
  }

  @Post('products/:id/inquiry')
  @Roles('warehouse')
  submitInquiry(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SubmitProductInquiryDto) {
    return this.productsService.submitInquiry(id, dto, user);
  }

  @Get('admin/products')
  @Roles('admin')
  getAdminProducts() {
    return this.productsService.getAdminProducts();
  }

  @Post('admin/products')
  @Roles('admin')
  createProduct(@CurrentUser() user: AuthUser, @Body() dto: SaveProductDto) {
    return this.productsService.createProduct(dto, user);
  }

  @Put('admin/products/:id')
  @Roles('admin')
  updateProduct(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SaveProductDto) {
    return this.productsService.updateProduct(id, dto, user);
  }

  @Put('admin/products/:id/status')
  @Roles('admin')
  updateProductStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProductStatusDto) {
    return this.productsService.updateProductStatus(id, dto, user);
  }
}
