import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '海外仓经营管理系统',
  description: '财务、KPI 与需求中心 MVP',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
