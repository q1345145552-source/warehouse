const FINANCE_SYNC_EVENT = 'finance-data-updated';
const FINANCE_SYNC_KEY = 'finance_data_sync_signal_v1';

export function emitFinanceDataUpdated() {
  if (typeof window === 'undefined') return;
  const syncAt = new Date().toISOString();
  window.localStorage.setItem(FINANCE_SYNC_KEY, syncAt);
  window.dispatchEvent(new CustomEvent(FINANCE_SYNC_EVENT, { detail: { syncAt } }));
}

export function subscribeFinanceDataUpdated(onUpdated: (syncAt: string) => void) {
  if (typeof window === 'undefined') return () => {};

  const onCustomEvent = (event: Event) => {
    const payload = (event as CustomEvent<{ syncAt?: string }>).detail;
    onUpdated(payload?.syncAt ?? new Date().toISOString());
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== FINANCE_SYNC_KEY || !event.newValue) return;
    onUpdated(event.newValue);
  };

  window.addEventListener(FINANCE_SYNC_EVENT, onCustomEvent as EventListener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(FINANCE_SYNC_EVENT, onCustomEvent as EventListener);
    window.removeEventListener('storage', onStorage);
  };
}
