'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { saveAuth } from '@/lib/auth';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  role: 'warehouse' | 'admin';
  warehouseId: string | null;
  account: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const form = new FormData(event.currentTarget);
    const payload = {
      account: String(form.get('account')),
      password: String(form.get('password')),
      role: String(form.get('role')),
    };

    try {
      const res = await apiPost<LoginResponse, typeof payload>('/auth/login', payload);
      saveAuth({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
        role: res.data.role,
        account: res.data.account,
        warehouseId: res.data.warehouseId,
      });
      router.push(res.data.role === 'admin' ? '/admin' : '/');
    } catch {
      setMessage('登录失败，请检查后端服务与账号信息。可用账号：warehouse_demo / admin_demo，密码 123456');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page" style={{ display: 'grid', placeItems: 'center' }}>
      <section className="section" style={{ width: 420 }}>
        <h2>系统登录</h2>
        <p>请选择角色并登录，角色仅支持仓库端与管理员。</p>
        <form className="form-grid" onSubmit={onSubmit}>
          <input name="account" placeholder="账号" defaultValue="warehouse_demo" required />
          <input name="password" type="password" placeholder="密码" defaultValue="123456" required />
          <select name="role" defaultValue="warehouse">
            <option value="warehouse">仓库端</option>
            <option value="admin">管理员</option>
          </select>
          <button type="submit" disabled={loading}>{loading ? '登录中...' : '登录'}</button>
        </form>
        {message ? <p>{message}</p> : null}
      </section>
    </main>
  );
}
