'use client';

import { InventoryBoard } from '../inventory-board';

export default function InventoryProductsPage() {
  return <InventoryBoard inventoryType="product" title="产品库存" subtitle="管理客户尾货并共享给其他仓库查看。" />;
}
