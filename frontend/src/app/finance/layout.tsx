'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { FinanceTerminologyProvider, useFinanceTerminology } from '@/lib/finance/terminology';
import { FINANCE_TABS } from './finance-tabs';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <FinanceTerminologyProvider>
      <FinanceLayoutBody>{children}</FinanceLayoutBody>
    </FinanceTerminologyProvider>
  );
}

function FinanceLayoutBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mode, setMode, term } = useFinanceTerminology();

  return (
    <AppShell title={term('finance.title')} subtitle={term('finance.subtitle')}>
      <section className="section finance-tabs-wrap">
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{term('finance.switchLabel')}：</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
            <option value="professional">{term('finance.mode.professional')}</option>
            <option value="simple">{term('finance.mode.simple')}</option>
          </select>
        </div>
        <nav className="finance-tabs-nav">
          {FINANCE_TABS.filter((tab) => tab.enabled).map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link key={tab.key} href={tab.href} className={`finance-tab-link${active ? ' active' : ''}`}>
                {term(tab.termKey)}
              </Link>
            );
          })}
        </nav>
      </section>
      {children}
    </AppShell>
  );
}
