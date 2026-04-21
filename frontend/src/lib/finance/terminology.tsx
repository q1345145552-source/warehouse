'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getFinanceModuleFieldLabel,
  getFinanceModuleLabel,
  getFinanceTerm,
  type FinanceTermKey,
  type FinanceTerminologyMode,
} from './terminology-dictionary';
import type { FinanceTargetModule } from './types';

const STORAGE_KEY = 'finance.terminology.mode';

type FinanceTerminologyContextValue = {
  mode: FinanceTerminologyMode;
  setMode: (mode: FinanceTerminologyMode) => void;
  term: (key: FinanceTermKey) => string;
  moduleLabel: (module: FinanceTargetModule) => string;
  moduleFieldLabel: (module: FinanceTargetModule, fieldKey: string) => string;
};

const FinanceTerminologyContext = createContext<FinanceTerminologyContextValue | null>(null);

export function FinanceTerminologyProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<FinanceTerminologyMode>('professional');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'professional' || saved === 'simple') {
      setMode(saved);
    }
  }, []);

  function updateMode(next: FinanceTerminologyMode) {
    setMode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  const value = useMemo<FinanceTerminologyContextValue>(
    () => ({
      mode,
      setMode: updateMode,
      term: (key) => getFinanceTerm(key, mode),
      moduleLabel: (module) => getFinanceModuleLabel(module, mode),
      moduleFieldLabel: (module, fieldKey) => getFinanceModuleFieldLabel(module, fieldKey, mode),
    }),
    [mode],
  );

  return <FinanceTerminologyContext.Provider value={value}>{children}</FinanceTerminologyContext.Provider>;
}

export function useFinanceTerminology() {
  const context = useContext(FinanceTerminologyContext);
  if (!context) {
    throw new Error('useFinanceTerminology must be used within FinanceTerminologyProvider');
  }
  return context;
}
