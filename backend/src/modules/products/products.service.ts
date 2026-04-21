import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/auth/current-user.decorator';
import { SaveProductDto } from './dto/save-product.dto';
import { SubmitProductInquiryDto } from './dto/submit-product-inquiry.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { QueryProductsDto } from './dto/query-products.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProducts(query: QueryProductsDto) {
    const category = query.category?.trim();
    const onlySellable = query.onlySellable ?? true;
    const now = new Date();
    let data;
    try {
      data = await this.prisma.product.findMany({
        where: {
          ...(onlySellable ? { status: 'active' } : {}),
          ...(category ? { category } : {}),
        },
        orderBy: [{ createdAt: 'desc' }],
      });
    } catch (error) {
      return this.handleProductSchemaError(error);
    }
    const filtered = onlySellable ? data.filter((item) => this.isProductCurrentlySellable(item, now)) : data;

    return {
      success: true,
      data: filtered.map((item) => this.toProductResponse(item, now)),
    };
  }

  async getAdminProducts() {
    const now = new Date();
    let data;
    try {
      data = await this.prisma.product.findMany({
        orderBy: [{ createdAt: 'desc' }],
      });
    } catch (error) {
      return this.handleProductSchemaError(error);
    }
    return {
      success: true,
      data: data.map((item) => this.toProductResponse(item, now)),
    };
  }

  async createProduct(dto: SaveProductDto, user: AuthUser) {
    const listedAt = this.parseDateTime(dto.listedAt);
    const unlistedAt = this.parseDateTime(dto.unlistedAt);
    if (listedAt && unlistedAt && listedAt.getTime() > unlistedAt.getTime()) {
      return { success: false, message: '上架时间不能晚于下架时间', code: 'PRODUCT_SALE_WINDOW_INVALID' };
    }

    let data;
    try {
      data = await this.prisma.product.create({
        data: {
          productName: dto.productName.trim(),
          category: dto.category.trim(),
          coverImageUrl: dto.coverImageUrl?.trim() || null,
          description: dto.description.trim(),
          price: dto.price,
          unit: dto.unit?.trim() || null,
          stockQuantity: dto.stockQuantity ?? 0,
          isSellable: dto.isSellable ?? true,
          status: dto.status ?? 'active',
          listedAt: listedAt ?? null,
          unlistedAt: unlistedAt ?? null,
        },
      });
    } catch (error) {
      return this.handleProductSchemaError(error);
    }
    await this.log(
      'product',
      'create',
      { productId: data.id, status: data.status, stockQuantity: data.stockQuantity, isSellable: data.isSellable },
      user.account,
    );
    return { success: true, message: '商品已创建', data: this.toProductResponse(data, new Date()) };
  }

  async updateProduct(id: string, dto: SaveProductDto, user: AuthUser) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) return { success: false, message: '商品不存在', code: 'PRODUCT_NOT_FOUND' };
    const listedAt = this.parseDateTime(dto.listedAt) ?? existing.listedAt;
    const unlistedAt = this.parseDateTime(dto.unlistedAt) ?? existing.unlistedAt;
    if (listedAt && unlistedAt && listedAt.getTime() > unlistedAt.getTime()) {
      return { success: false, message: '上架时间不能晚于下架时间', code: 'PRODUCT_SALE_WINDOW_INVALID' };
    }

    const data = await this.prisma.product.update({
      where: { id },
      data: {
        productName: dto.productName.trim(),
        category: dto.category.trim(),
        coverImageUrl: dto.coverImageUrl?.trim() || null,
        description: dto.description.trim(),
        price: dto.price,
        unit: dto.unit?.trim() || null,
        stockQuantity: dto.stockQuantity ?? existing.stockQuantity,
        isSellable: dto.isSellable ?? existing.isSellable,
        status: dto.status ?? existing.status,
        listedAt,
        unlistedAt,
      },
    });
    await this.log(
      'product',
      'update',
      { productId: data.id, status: data.status, stockQuantity: data.stockQuantity, isSellable: data.isSellable },
      user.account,
    );
    return { success: true, message: '商品已更新', data: this.toProductResponse(data, new Date()) };
  }

  async updateProductStatus(id: string, dto: UpdateProductStatusDto, user: AuthUser) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) return { success: false, message: '商品不存在', code: 'PRODUCT_NOT_FOUND' };
    const listedAt = this.parseDateTime(dto.listedAt) ?? existing.listedAt;
    const unlistedAt = this.parseDateTime(dto.unlistedAt) ?? existing.unlistedAt;
    if (listedAt && unlistedAt && listedAt.getTime() > unlistedAt.getTime()) {
      return { success: false, message: '上架时间不能晚于下架时间', code: 'PRODUCT_SALE_WINDOW_INVALID' };
    }

    const data = await this.prisma.product.update({
      where: { id },
      data: {
        status: dto.status,
        listedAt,
        unlistedAt,
      },
    });
    await this.log(
      'product',
      'update_status',
      { productId: data.id, status: data.status, listedAt: data.listedAt, unlistedAt: data.unlistedAt },
      user.account,
    );
    return { success: true, message: '商品状态已更新', data: this.toProductResponse(data, new Date()) };
  }

  async submitInquiry(id: string, dto: SubmitProductInquiryDto, user: AuthUser) {
    if (!user.warehouseId) {
      throw new ForbiddenException('仓库账号未绑定仓库');
    }
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) return { success: false, message: '商品不存在', code: 'PRODUCT_NOT_FOUND' };
    if (product.status !== 'active') return { success: false, message: '商品未上架，暂不可提交采购意向', code: 'PRODUCT_NOT_ACTIVE' };
    if (!product.isSellable) return { success: false, message: '商品当前被管理员设为不可售', code: 'PRODUCT_NOT_SELLABLE' };
    const now = new Date();
    if (!this.isInSaleWindow(product, now)) {
      return { success: false, message: '商品不在可售时间窗口，请联系管理员调整上/下架时间', code: 'PRODUCT_OUT_OF_SALE_WINDOW' };
    }

    const configuredType = await this.prisma.demandTypeConfig.findFirst({
      where: { typeKey: 'warehouse_request', isEnabled: true },
    });
    const fallbackType = await this.prisma.demandTypeConfig.findFirst({
      where: { isEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    // 兜底保障：即使配置表为空，也允许商品采购意向进入管理员需求池。
    // 后续管理员可再补齐 DemandTypeConfig，用于前端展示与类型管理。
    const demandType = configuredType?.typeKey ?? fallbackType?.typeKey ?? 'warehouse_request';

    const quantity = dto.quantity ?? 1;
    if (quantity > product.stockQuantity) {
      return { success: false, message: '库存不足，请联系管理员更新库存', code: 'PRODUCT_STOCK_NOT_ENOUGH' };
    }
    const descriptionLines = [
      `商品ID: ${product.id}`,
      `商品名称: ${product.productName}`,
      `商品分类: ${product.category}`,
      `可用库存: ${product.stockQuantity}${product.unit ?? ''}`,
      `意向数量: ${quantity}${product.unit ?? ''}`,
      `微信号: ${dto.note.trim()}`,
    ];
    const demand = await this.prisma.demand.create({
      data: {
        warehouseId: user.warehouseId,
        demandType,
        title: `商品采购意向-${product.productName}`,
        description: descriptionLines.join('\n'),
        urgency: dto.urgency ?? 'medium',
        contactName: dto.contactName.trim(),
        status: 'submitted',
      },
    });
    await this.log(
      'product',
      'inquiry',
      { productId: product.id, demandId: demand.id, warehouseId: user.warehouseId, quantity },
      user.account,
    );
    return {
      success: true,
      message: '采购意向已提交至管理员需求池，管理员将尽快处理',
      data: {
        ...demand,
        targetQueue: 'admin_demand_pool',
      },
    };
  }

  private async log(module: string, action: string, payload: Record<string, unknown>, operator = 'system') {
    await this.prisma.operationLog.create({
      data: {
        module,
        action,
        operator,
        payload: JSON.stringify(payload),
      },
    });
  }

  private parseDateTime(value?: string) {
    if (value === undefined || value.trim() === '') return undefined;
    return new Date(value);
  }

  private handleProductSchemaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
      return {
        success: false,
        message: '商品表字段尚未同步，请执行 prisma db push 后重试',
        code: 'PRODUCT_SCHEMA_NOT_SYNC',
      };
    }
    throw error;
  }

  private isInSaleWindow(product: { listedAt: Date | null; unlistedAt: Date | null }, now: Date) {
    if (product.listedAt && now.getTime() < product.listedAt.getTime()) return false;
    if (product.unlistedAt && now.getTime() > product.unlistedAt.getTime()) return false;
    return true;
  }

  private isProductCurrentlySellable(
    product: { status: string; isSellable: boolean; listedAt: Date | null; unlistedAt: Date | null },
    now: Date,
  ) {
    return product.status === 'active' && product.isSellable && this.isInSaleWindow(product, now);
  }

  private toProductResponse(
    product: {
      id: string;
      productName: string;
      category: string;
      coverImageUrl: string | null;
      description: string;
      price: unknown;
      unit: string | null;
      stockQuantity: number;
      isSellable: boolean;
      status: string;
      listedAt: Date | null;
      unlistedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    now: Date,
  ) {
    return {
      ...product,
      price: product.price === null ? null : Number(product.price),
      isCurrentlySellable: this.isProductCurrentlySellable(product, now),
    };
  }
}
