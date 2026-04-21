'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { apiGet, apiPost } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProducts(nextCategory?: string) {
    setLoadingProducts(true);
    try {
      if (!isLoggedIn()) {
        setProducts([]);
        setSelectedProductId('');
        setMessage('登录状态已失效，请先前往登录页重新登录仓库账号。');
        return;
      }
      const queryCategory = nextCategory ?? category;
      const params = new URLSearchParams();
      if (queryCategory) params.set('category', queryCategory);
      params.set('onlySellable', 'false');
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await apiGet<Product[]>(`/products${query}`);
      if (!res.success) {
        setProducts([]);
        setSelectedProductId('');
        setMessage(res.message || '商品加载失败，请稍后重试。');
        return;
      }
      setProducts(res.data);
      const stillExists = res.data.some((item) => item.id === selectedProductId);
      if (!stillExists) {
        setSelectedProductId(res.data[0]?.id ?? '');
      }
    } catch (error) {
      setProducts([]);
      setSelectedProductId('');
      setMessage(getErrorMessage(error, '商品加载失败，请稍后重试。'));
    } finally {
      setLoadingProducts(false);
    }
  }

  const categories = useMemo(
    () => Array.from(new Set(products.map((item) => item.category).filter(Boolean))),
    [products],
  );
  const selectedProduct = products.find((item) => item.id === selectedProductId) ?? null;
  const canSubmitInquiry = Boolean(selectedProduct && selectedProduct.isCurrentlySellable && selectedProduct.stockQuantity > 0);

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!selectedProduct) {
      setMessage('请先选择商品。');
      return;
    }
    if (!canSubmitInquiry) {
      setMessage('当前商品不可提交采购意向，请选择其他可售商品。');
      return;
    }
    setLoading(true);
    setMessage('');
    const form = new FormData(formElement);
    const quantity = Number(form.get('quantity') || 1);
    const contactName = String(form.get('contactName') || '').trim();
    const wechatId = String(form.get('note') || '').trim();
    if (quantity < 1) {
      setMessage('意向数量至少为 1。');
      setLoading(false);
      return;
    }
    if (!contactName) {
      setMessage('请填写联系人姓名后再提交采购意向。');
      setLoading(false);
      return;
    }
    if (!wechatId) {
      setMessage('请填写微信号后再提交采购意向。');
      setLoading(false);
      return;
    }
    if (quantity > selectedProduct.stockQuantity) {
      setMessage(`意向数量超过可用库存（当前库存 ${selectedProduct.stockQuantity}）。`);
      setLoading(false);
      return;
    }
    try {
      const res = await apiPost<
        { id: string; targetQueue?: string },
        { quantity: number; urgency: string; contactName: string; note: string }
      >(`/products/${selectedProduct.id}/inquiry`, {
        quantity,
        urgency: String(form.get('urgency') || 'medium'),
        contactName,
        note: wechatId,
      });
      if (!res.success) {
        setMessage(res.message || '采购意向提交失败，请检查商品状态与需求类型配置。');
        return;
      }
      setMessage(`✅ ${res.message || `采购意向已提交至${res.data?.targetQueue === 'admin_demand_pool' ? '管理员需求池' : '需求中心'}，管理员会在需求中心处理。`}`);
      formElement.reset();
    } catch (error) {
      setMessage(getErrorMessage(error, '采购意向提交失败，请稍后重试。'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="商品销售" subtitle="浏览管理员上架的仓库器材并提交采购意向。">
      <section className="section">
        <h3>筛选</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={category}
            onChange={(event) => {
              const next = event.target.value;
              setCategory(next);
              void loadProducts(next);
            }}
          >
            <option value="">全部分类</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Link href="/demands">查看我的需求</Link>
        </div>
      </section>

      <section className="section">
        <h3>商品列表</h3>
        {loadingProducts ? <p>商品加载中...</p> : null}
        {!loadingProducts && products.length === 0 ? <p>当前暂无可展示商品，请联系管理员检查上架状态。</p> : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {products.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedProductId(item.id)}
              style={{
                border: selectedProductId === item.id ? '2px solid #2563eb' : '1px solid #d1d5db',
                borderRadius: 12,
                padding: 0,
                background: '#fff',
                textAlign: 'left',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              {item.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.coverImageUrl} alt={item.productName} style={{ width: '100%', height: 150, objectFit: 'cover' }} />
              ) : (
                <div style={{ height: 150, display: 'grid', placeItems: 'center', background: '#f1f5f9', color: '#64748b' }}>暂无图片</div>
              )}
              <div style={{ padding: 12 }}>
                <p style={{ margin: 0, fontWeight: 700 }}>{item.productName}</p>
                <p style={{ margin: '6px 0', fontSize: 13, color: '#475569' }}>{item.category}</p>
                <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>{item.description}</p>
                <p style={{ margin: '8px 0 0', color: '#0f172a', fontWeight: 600 }}>
                  {item.price === null || item.price === undefined ? '面议' : `¥ ${item.price}`}{item.unit ? ` / ${item.unit}` : ''}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: item.stockQuantity > 0 ? '#166534' : '#b91c1c' }}>
                  库存：{item.stockQuantity}
                  {item.unit ? ` ${item.unit}` : ''}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: item.isCurrentlySellable ? '#166534' : '#b91c1c' }}>
                  {item.isCurrentlySellable ? '当前可售' : '当前不可售'}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
                  上架窗口：
                  {item.listedAt ? item.listedAt.slice(0, 16).replace('T', ' ') : '未设置'} ~{' '}
                  {item.unlistedAt ? item.unlistedAt.slice(0, 16).replace('T', ' ') : '未设置'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h3>提交采购意向</h3>
        <p style={{ marginTop: 0 }}>
          当前商品：<strong>{selectedProduct?.productName ?? '请先选择商品卡'}</strong>
        </p>
        {selectedProduct ? (
          <p style={{ marginTop: 0, color: canSubmitInquiry ? '#166534' : '#b91c1c' }}>
            {canSubmitInquiry
              ? `可提交采购意向，当前库存 ${selectedProduct.stockQuantity}${selectedProduct.unit ? ` ${selectedProduct.unit}` : ''}`
              : '该商品当前不可提交采购意向（可能因不可售、已过期或库存不足）'}
          </p>
        ) : null}
        <form className="form-grid" onSubmit={submitInquiry}>
          <input name="quantity" type="number" min="1" defaultValue="1" placeholder="意向数量" />
          <select name="urgency" defaultValue="medium">
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
          <input name="contactName" placeholder="联系人姓名（必填）" required />
          <input name="note" placeholder="微信号（必填项）" required />
          <button type="submit" disabled={!selectedProduct || loading || !canSubmitInquiry}>
            {loading ? '提交中...' : '提交采购意向'}
          </button>
        </form>
        {message ? <p>{message}</p> : null}
      </section>
    </AppShell>
  );
}
