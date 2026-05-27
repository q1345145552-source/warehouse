'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { saveAuth } from '@/lib/auth';

type RegisterResponse = {
  accessToken: string;
  refreshToken: string;
  role: 'warehouse' | 'admin';
  warehouseId: string | null;
  account: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const form = new FormData(event.currentTarget);
    const password = String(form.get('password'));
    const confirmPassword = String(form.get('confirmPassword'));

    if (password !== confirmPassword) {
      setMessage('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    const payload = {
      account: String(form.get('account')),
      password,
      confirmPassword,
      phone: String(form.get('phone')),
      role: String(form.get('role')),
      email: String(form.get('email')) || undefined,
      companyName: String(form.get('companyName')) || undefined,
    };

    try {
      const res = await apiPost<RegisterResponse, typeof payload>('/auth/register', payload);
      saveAuth({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
        role: res.data.role,
        account: res.data.account,
        warehouseId: res.data.warehouseId,
      });
      showToast('注册成功，正在跳转...');
      setTimeout(() => {
        router.push(res.data.role === 'admin' ? '/admin' : '/');
      }, 1500);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || '注册失败，请稍后重试';
      setMessage(typeof errorMsg === 'string' ? errorMsg : '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page" style={{ display: 'grid', placeItems: 'center' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#52c41a',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: 8,
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {toast}
        </div>
      )}
      <section className="section" style={{ width: 420 }}>
        <h2>用户注册</h2>
        <p>请填写以下信息完成注册</p>
        <form className="form-grid" onSubmit={onSubmit}>
          <input
            name="account"
            placeholder="账号（字母、数字、下划线，3-30位）"
            required
            pattern="^[a-zA-Z0-9_]{3,30}$"
            title="账号只能包含字母、数字和下划线，长度 3-30 位"
          />
          <input
            name="password"
            type="password"
            placeholder="密码（至少8位，包含字母和数字）"
            required
            minLength={8}
            pattern="^(?=.*[a-zA-Z])(?=.*\d).+$"
            title="密码必须包含字母和数字，长度至少8位"
          />
          <input
            name="confirmPassword"
            type="password"
            placeholder="确认密码"
            required
          />
          <input
            name="phone"
            type="tel"
            placeholder="手机号"
            required
            pattern="^1[3-9]\d{9}$"
            title="请输入正确的手机号"
          />
          <select name="role" defaultValue="warehouse">
            <option value="warehouse">仓库端</option>
            <option value="admin">管理员</option>
          </select>
          <input
            name="email"
            type="email"
            placeholder="邮箱（选填）"
          />
          <input
            name="companyName"
            placeholder="公司名称（选填）"
            maxLength={100}
          />
          <button type="submit" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        {message ? <p style={{ color: '#ff4d4f' }}>{message}</p> : null}
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          已有账号？<a href="/login" style={{ color: '#1890ff' }}>去登录</a>
        </p>
      </section>
    </main>
  );
}
