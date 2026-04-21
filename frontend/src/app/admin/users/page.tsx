'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiGet, apiPut } from '@/lib/api';

type AdminUser = {
  id: string;
  account: string;
  role: 'warehouse' | 'admin';
  status: 'active' | 'disabled';
  warehouseId: string | null;
  warehouseName: string | null;
  failedLoginCount: number;
  lockedUntil: string | null;
};

type WarehouseOption = {
  id: string;
  name: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [newPassword, setNewPassword] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const [usersRes, warehousesRes] = await Promise.all([
        apiGet<AdminUser[]>('/admin/users?limit=200'),
        apiGet<WarehouseOption[]>('/admin/warehouses'),
      ]);
      setUsers(usersRes.data);
      setWarehouses(warehousesRes.data.map((item) => ({ id: item.id, name: item.name })));
    } catch {
      setMessage('请先登录管理员账号。');
      setUsers([]);
      setWarehouses([]);
    }
  }

  async function toggleUserStatus(user: AdminUser) {
    await apiPut(`/admin/users/${user.id}/status`, {
      status: user.status === 'active' ? 'disabled' : 'active',
      unlockNow: true,
    });
    setMessage(`账号 ${user.account} 状态已更新。`);
    await load();
  }

  async function unlockUser(userId: string) {
    await apiPut(`/admin/users/${userId}/status`, {
      status: 'active',
      unlockNow: true,
    });
    setMessage('账号已解锁。');
    await load();
  }

  async function changeUserRole(user: AdminUser, role: 'warehouse' | 'admin', warehouseId?: string) {
    await apiPut(`/admin/users/${user.id}/role`, {
      role,
      warehouseId: role === 'warehouse' ? (warehouseId ?? user.warehouseId ?? undefined) : undefined,
    });
    setMessage(`账号 ${user.account} 权限已更新。`);
    await load();
  }

  async function resetPassword(userId: string) {
    const password = newPassword[userId]?.trim();
    if (!password || password.length < 6) {
      setMessage('新密码至少 6 位。');
      return;
    }
    await apiPut(`/admin/users/${userId}/password`, { password });
    setNewPassword((prev) => ({ ...prev, [userId]: '' }));
    setMessage('密码重置成功，原会话已失效。');
  }

  return (
    <AppShell title="账号权限中心" subtitle="集中管理账号启停、角色切换、绑定仓库与密码重置。">
      <section className="section">
        <h3>快捷入口</h3>
        <Link href="/admin">返回管理员总览</Link>
      </section>

      <section className="section">
        <h3>账号权限管理</h3>
        <table className="table">
          <thead>
            <tr>
              <th>账号</th>
              <th>角色</th>
              <th>绑定仓库</th>
              <th>状态</th>
              <th>锁定信息</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.account}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(event) => {
                      const nextRole = event.target.value as 'warehouse' | 'admin';
                      void changeUserRole(user, nextRole);
                    }}
                  >
                    <option value="warehouse">warehouse</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>
                  {user.role === 'warehouse' ? (
                    <select
                      value={user.warehouseId ?? ''}
                      onChange={(event) => void changeUserRole(user, 'warehouse', event.target.value || undefined)}
                    >
                      <option value="">未绑定</option>
                      {warehouses.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{user.status}</td>
                <td>{user.lockedUntil ? `锁定至 ${new Date(user.lockedUntil).toLocaleString()}` : `失败 ${user.failedLoginCount} 次`}</td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => void toggleUserStatus(user)}>{user.status === 'active' ? '禁用' : '启用'}</button>
                  <button onClick={() => void unlockUser(user.id)}>解锁</button>
                  <input
                    style={{ width: 120 }}
                    type="password"
                    placeholder="新密码"
                    value={newPassword[user.id] ?? ''}
                    onChange={(event) => setNewPassword((prev) => ({ ...prev, [user.id]: event.target.value }))}
                  />
                  <button onClick={() => void resetPassword(user.id)}>重置密码</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {message ? <p>{message}</p> : null}
      </section>
    </AppShell>
  );
}
