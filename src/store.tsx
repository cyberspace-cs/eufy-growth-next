import { createContext, useContext, useEffect, useState } from 'react';
import type { AppState } from './types';
import { initialState } from './data/seed';

const STORE_KEY = 'eufy_growth_next_v1';

interface Store {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch { /* ignore */ }
  return initialState();
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);
  const store: Store = {
    state,
    update: (fn) => setState((s) => fn(s)),
    reset: () => setState(initialState()),
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
