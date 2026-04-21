'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuth, getAccount, getRole } from '@/lib/auth';

type NavLeaf = {
  href: string;
  label: string;
};

type NavGroup = {
  groupKey: 'finance' | 'kpi' | 'demands' | 'inventory';
  label: string;
  children: NavLeaf[];
};

const navItems: Array<NavLeaf | NavGroup> = [
  { href: '/', label: '工作台' },
  { href: '/products', label: '商品销售' },
  {
    groupKey: 'finance',
    label: '仓库财务',
    children: [
      { href: '/finance', label: '财务管理' },
    ],
  },
  {
    groupKey: 'kpi',
    label: '仓库KPI',
    children: [
      { href: '/kpi', label: 'KPI 考核' },
      { href: '/kpi/analysis', label: 'KPI 分析' },
    ],
  },
  {
    groupKey: 'inventory',
    label: '库存处理',
    children: [
      { href: '/inventory/products', label: '产品库存' },
      { href: '/inventory/equipment', label: '设备库存' },
      { href: '/inventory/others', label: '其他库存' },
    ],
  },
  {
    groupKey: 'demands',
    label: '需求中心',
    children: [
      { href: '/demands?type=warehouse_request', label: '仓库需求' },
      { href: '/demands?type=group_purchase', label: '拼团需求' },
      { href: '/demands?type=staffing', label: '人员需求' },
      { href: '/demands?type=qualification_auth', label: '资质认证' },
      { href: '/demands?type=certificate_processing', label: '证件办理' },
    ],
  },
];

const adminNavItems = [
  { href: '/admin', label: '管理员总览' },
  { href: '/admin/demands', label: '管理员需求池' },
  { href: '/admin/inventory', label: '库存审核' },
  { href: '/admin/products', label: '商品管理' },
  { href: '/admin/finance-rules', label: '财务规则中心' },
  { href: '/admin/users', label: '账号权限中心' },
  { href: '/admin/logs', label: '日志中心' },
  { href: '/admin/warehouses', label: '仓库管理中心' },
];

export function AppShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const role = getRole();
  const account = getAccount();
  const [financeMenuOpen, setFinanceMenuOpen] = useState(false);
  const [kpiMenuOpen, setKpiMenuOpen] = useState(false);
  const [demandsMenuOpen, setDemandsMenuOpen] = useState(false);
  const [inventoryMenuOpen, setInventoryMenuOpen] = useState(false);

  useEffect(() => {
    if (pathname.startsWith('/finance')) {
      setFinanceMenuOpen(true);
    }
    if (pathname.startsWith('/kpi')) {
      setKpiMenuOpen(true);
    }
    if (pathname.startsWith('/demands')) {
      setDemandsMenuOpen(true);
    }
    if (pathname.startsWith('/inventory')) {
      setInventoryMenuOpen(true);
    }
  }, [pathname]);

  return (
    <div className="page shell">
      <aside className="sidebar">
        <h1>海外仓经营管理</h1>
        <p style={{ marginTop: -8, fontSize: 12, opacity: 0.8 }}>
          {role ? `角色: ${role === 'admin' ? '管理员' : '仓库端'} / ${account ?? '-'}` : '未登录'}
        </p>
        <nav>
          {navItems.map((item) => {
            if ('children' in item) {
              const isOpen =
                item.groupKey === 'finance'
                  ? financeMenuOpen
                  : item.groupKey === 'kpi'
                    ? kpiMenuOpen
                    : item.groupKey === 'demands'
                      ? demandsMenuOpen
                      : inventoryMenuOpen;
              const toggle = () => {
                if (item.groupKey === 'finance') {
                  setFinanceMenuOpen((prev) => !prev);
                  return;
                }
                if (item.groupKey === 'kpi') {
                  setKpiMenuOpen((prev) => !prev);
                  return;
                }
                if (item.groupKey === 'demands') {
                  setDemandsMenuOpen((prev) => !prev);
                  return;
                }
                setInventoryMenuOpen((prev) => !prev);
              };

              return (
                <div key={item.label} className="sidebar-nav-group">
                  <button
                    className="sidebar-nav-group-toggle"
                    onClick={toggle}
                    type="button"
                  >
                    <span>{item.label}</span>
                    <span>{isOpen ? '▾' : '▸'}</span>
                  </button>
                  {isOpen ? (
                    <div className="sidebar-nav-children">
                      {item.children.map((child) => (
                        <Link key={child.href} href={child.href}>
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            );
          })}
          {role === 'admin'
            ? adminNavItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))
            : null}
        </nav>
        <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
          <Link href="/login">去登录</Link>
          <button
            style={{ height: 36, borderRadius: 8, border: 0, background: '#ef4444', color: '#fff' }}
            onClick={() => {
              clearAuth();
              router.push('/login');
            }}
          >
            退出
          </button>
        </div>
      </aside>
      <main className="content">
        <header className="header">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </header>
        {children}
      </main>
    </div>
  );
}
