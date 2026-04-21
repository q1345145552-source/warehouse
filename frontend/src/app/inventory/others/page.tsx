'use client';

import { InventoryBoard } from '../inventory-board';

export default function InventoryOthersPage() {
  return <InventoryBoard inventoryType="other" title="其他库存" subtitle="管理纸箱、气泡膜等耗材及其他剩余物资。" />;
}
