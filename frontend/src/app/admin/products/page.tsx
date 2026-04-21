'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { apiGet, apiPost, apiPut } from '@/lib/api';

type Product = {
  id: string;
  productName: string;
  category: string;
  coverImageUrl?: string | null;
  description: string;
  price?: number | null;
  unit?: string | null;
  stockQuantity: number;
  isSellable: boolean;
  status: 'active' | 'inactive';
  listedAt: string | null;
  unlistedAt: string | null;
  isCurrentlySellable: boolean;
};

type ProductDraft = {
  productName: string;
  category: string;
  coverImageUrl: string;
  description: string;
  price: string;
  unit: string;
  stockQuantity: string;
  isSellable: boolean;
  status: 'active' | 'inactive';
  listedAt: string;
  unlistedAt: string;
};

const emptyCreateDraft: ProductDraft = {
  productName: '',
  category: '',
  coverImageUrl: '',
  description: '',
  price: '',
  unit: '',
  stockQuantity: '0',
  isSellable: true,
  status: 'active',
  listedAt: '',
  unlistedAt: '',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join('；');
    if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message;
  } catch {
    // ignore parse errors
  }
  return error.message || fallback;
}

function toDatetimeInputValue(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function toIsoOrUndefined(datetimeLocal: string) {
  const value = datetimeLocal.trim();
  if (!value) return undefined;
  return new Date(value).toISOString();
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [createDraft, setCreateDraft] = useState<ProductDraft>(emptyCreateDraft);
  const [editDrafts, setEditDrafts] = useState<Record<string, ProductDraft>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const res = await apiGet<Product[]>('/admin/products');
      if (!res.success) {
        setProducts([]);
        setMessage(res.message || '商品列表加载失败。');
        return;
      }
      setProducts(res.data);
      setEditDrafts((prev) => {
        const next = { ...prev };
        for (const item of res.data) {
          if (!next[item.id]) {
            next[item.id] = {
              productName: item.productName,
              category: item.category,
              coverImageUrl: item.coverImageUrl ?? '',
              description: item.description,
              price: item.price === null || item.price === undefined ? '' : String(item.price),
              unit: item.unit ?? '',
              stockQuantity: String(item.stockQuantity ?? 0),
              isSellable: item.isSellable ?? true,
              status: item.status,
              listedAt: toDatetimeInputValue(item.listedAt),
              unlistedAt: toDatetimeInputValue(item.unlistedAt),
            };
          }
        }
        return next;
      });
    } catch {
      setProducts([]);
      setMessage('商品列表加载失败。');
    }
  }

  async function createProduct() {
    if (!createDraft.productName.trim() || !createDraft.category.trim() || !createDraft.description.trim()) {
      setMessage('请填写商品名称、分类与描述。');
      return;
    }
    if (Number(createDraft.stockQuantity || 0) < 0) {
      setMessage('库存数量不能小于 0。');
      return;
    }
    if (
      createDraft.listedAt &&
      createDraft.unlistedAt &&
      new Date(createDraft.listedAt).getTime() > new Date(createDraft.unlistedAt).getTime()
    ) {
      setMessage('上架时间不能晚于下架时间。');
      return;
    }
    try {
      const res = await apiPost('/admin/products', {
        productName: createDraft.productName.trim(),
        category: createDraft.category.trim(),
        coverImageUrl: createDraft.coverImageUrl.trim() || undefined,
        description: createDraft.description.trim(),
        price: createDraft.price ? Number(createDraft.price) : undefined,
        unit: createDraft.unit.trim() || undefined,
        stockQuantity: Number(createDraft.stockQuantity || 0),
        isSellable: createDraft.isSellable,
        status: createDraft.status,
        listedAt: toIsoOrUndefined(createDraft.listedAt),
        unlistedAt: toIsoOrUndefined(createDraft.unlistedAt),
      });
      if (!res.success) {
        setMessage(res.message || '商品创建失败，请检查输入后重试。');
        return;
      }
      setMessage('商品已创建。');
      setCreateDraft(emptyCreateDraft);
      await loadProducts();
    } catch (error) {
      setMessage(getErrorMessage(error, '商品创建失败，请稍后重试。'));
    }
  }

  async function saveProduct(productId: string) {
    const draft = editDrafts[productId];
    if (!draft || !draft.productName.trim() || !draft.category.trim() || !draft.description.trim()) {
      setMessage('请补全商品名称、分类与描述。');
      return;
    }
    if (Number(draft.stockQuantity || 0) < 0) {
      setMessage('库存数量不能小于 0。');
      return;
    }
    if (draft.listedAt && draft.unlistedAt && new Date(draft.listedAt).getTime() > new Date(draft.unlistedAt).getTime()) {
      setMessage('上架时间不能晚于下架时间。');
      return;
    }
    try {
      const res = await apiPut(`/admin/products/${productId}`, {
        productName: draft.productName.trim(),
        category: draft.category.trim(),
        coverImageUrl: draft.coverImageUrl.trim() || undefined,
        description: draft.description.trim(),
        price: draft.price ? Number(draft.price) : undefined,
        unit: draft.unit.trim() || undefined,
        stockQuantity: Number(draft.stockQuantity || 0),
        isSellable: draft.isSellable,
        status: draft.status,
        listedAt: toIsoOrUndefined(draft.listedAt),
        unlistedAt: toIsoOrUndefined(draft.unlistedAt),
      });
      if (!res.success) {
        setMessage(res.message || '商品更新失败，请检查输入后重试。');
        return;
      }
      setMessage('商品已更新。');
      await loadProducts();
    } catch (error) {
      setMessage(getErrorMessage(error, '商品更新失败，请稍后重试。'));
    }
  }

  async function toggleStatus(product: Product) {
    try {
      const res = await apiPut(`/admin/products/${product.id}/status`, {
        status: product.status === 'active' ? 'inactive' : 'active',
      });
      if (!res.success) {
        setMessage(res.message || '状态切换失败，请稍后重试。');
        return;
      }
      setMessage(`商品 ${product.productName} 已${product.status === 'active' ? '下架' : '上架'}。`);
      await loadProducts();
    } catch (error) {
      setMessage(getErrorMessage(error, '状态切换失败，请稍后重试。'));
    }
  }

  return (
    <AppShell title="商品管理" subtitle="管理员可上架、编辑并维护仓库常用器材。">
      <section className="section">
        <h3>快捷入口</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/admin">返回管理员总览</Link>
          <Link href="/products">查看仓库端商品销售页</Link>
        </div>
      </section>

      <section className="section">
        <h3>新增商品</h3>
        <div className="form-grid">
          <input
            placeholder="商品名称"
            value={createDraft.productName}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, productName: event.target.value }))}
          />
          <input
            placeholder="商品分类"
            value={createDraft.category}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, category: event.target.value }))}
          />
          <input
            placeholder="封面图URL（可选）"
            value={createDraft.coverImageUrl}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, coverImageUrl: event.target.value }))}
          />
          <input
            placeholder="商品描述"
            value={createDraft.description}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, description: event.target.value }))}
          />
          <input
            placeholder="价格（可选）"
            type="number"
            min="0"
            step="0.01"
            value={createDraft.price}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, price: event.target.value }))}
          />
          <input
            placeholder="单位（可选）"
            value={createDraft.unit}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, unit: event.target.value }))}
          />
          <input
            placeholder="库存数量"
            type="number"
            min="0"
            value={createDraft.stockQuantity}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, stockQuantity: event.target.value }))}
          />
          <select value={createDraft.isSellable ? 'yes' : 'no'} onChange={(event) => setCreateDraft((prev) => ({ ...prev, isSellable: event.target.value === 'yes' }))}>
            <option value="yes">可售</option>
            <option value="no">不可售</option>
          </select>
          <input
            type="datetime-local"
            value={createDraft.listedAt}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, listedAt: event.target.value }))}
          />
          <input
            type="datetime-local"
            value={createDraft.unlistedAt}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, unlistedAt: event.target.value }))}
          />
          <select value={createDraft.status} onChange={(event) => setCreateDraft((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))}>
            <option value="active">上架</option>
            <option value="inactive">下架</option>
          </select>
          <button onClick={() => void createProduct()}>创建商品</button>
        </div>
      </section>

      <section className="section">
        <h3>商品列表</h3>
        <table className="table">
          <thead>
            <tr>
              <th>商品名</th>
              <th>分类</th>
              <th>价格</th>
              <th>单位</th>
              <th>库存</th>
              <th>状态</th>
              <th>可售</th>
              <th>上架时间</th>
              <th>下架时间</th>
              <th>当前可售</th>
              <th>封面图</th>
              <th>描述</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {products.map((item) => {
              const draft = editDrafts[item.id] ?? {
                productName: item.productName,
                category: item.category,
                coverImageUrl: item.coverImageUrl ?? '',
                description: item.description,
                price: item.price === null || item.price === undefined ? '' : String(item.price),
                unit: item.unit ?? '',
                stockQuantity: String(item.stockQuantity ?? 0),
                isSellable: item.isSellable ?? true,
                status: item.status,
                listedAt: toDatetimeInputValue(item.listedAt),
                unlistedAt: toDatetimeInputValue(item.unlistedAt),
              };
              return (
                <tr key={item.id}>
                  <td>
                    <input
                      value={draft.productName}
                      onChange={(event) =>
                        setEditDrafts((prev) => ({ ...prev, [item.id]: { ...draft, productName: event.target.value } }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={draft.category}
                      onChange={(event) =>
                        setEditDrafts((prev) => ({ ...prev, [item.id]: { ...draft, category: event.target.value } }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.price}
                      onChange={(event) =>
                        setEditDrafts((prev) => ({ ...prev, [item.id]: { ...draft, price: event.target.value } }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={draft.unit}
                      onChange={(event) =>
                        setEditDrafts((prev) => ({ ...prev, [item.id]: { ...draft, unit: event.target.value } }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={draft.stockQuantity}
                      onChange={(event) =>
                        setEditDrafts((prev) => ({ ...prev, [item.id]: { ...draft, stockQuantity: event.target.value } }))
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        setEditDrafts((prev) => ({ ...prev, [item.id]: { ...draft, status: event.target.value as 'active' | 'inactive' } }))
                      }
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={draft.isSellable ? 'yes' : 'no'}
                      onChange={(event) =>
                        setEditDrafts((prev) => ({ ...prev, [item.id]: { ...draft, isSellable: event.target.value === 'yes' } }))
                      }
                    >
                      <option value="yes">可售</option>
                      <option value="no">不可售</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="datetime-local"
                      value={draft.listedAt}
                      onChange={(event) =>
                        setEditDrafts((prev) => ({ ...prev, [item.id]: { ...draft, listedAt: event.target.value } }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="datetime-local"
                      value={draft.unlistedAt}
                      onChange={(event) =>
                        setEditDrafts((prev) => ({ ...prev, [item.id]: { ...draft, unlistedAt: event.target.value } }))
                      }
                    />
                  </td>
                  <td>{item.isCurrentlySellable ? '是' : '否'}</td>
                  <td>
                    <input
                      value={draft.coverImageUrl}
                      onChange={(event) =>
                        setEditDrafts((prev) => ({ ...prev, [item.id]: { ...draft, coverImageUrl: event.target.value } }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={draft.description}
                      onChange={(event) =>
                        setEditDrafts((prev) => ({ ...prev, [item.id]: { ...draft, description: event.target.value } }))
                      }
                    />
                  </td>
                  <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => void saveProduct(item.id)}>保存</button>
                    <button onClick={() => void toggleStatus(item)}>{item.status === 'active' ? '下架' : '上架'}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {message ? <p>{message}</p> : null}
      </section>
    </AppShell>
  );
}
