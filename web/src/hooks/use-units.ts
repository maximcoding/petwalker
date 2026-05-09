'use client';

import { useEffect, useState } from 'react';

/**
 * Per-device unit preference for distance / weight displays. Pure
 * client-side concern (no server persistence needed) so we keep it in
 * localStorage — same pattern as the i18next language detector.
 *
 * Read from any component via:
 *
 *   const [units, setUnits] = useUnits();
 *
 * Toggling persists immediately and broadcasts a `storage` event so
 * other tabs / components stay in sync.
 */
export type UnitsPreference = 'metric' | 'imperial';

const STORAGE_KEY = 'petwalker:units';

function readStored(): UnitsPreference {
  if (typeof window === 'undefined') return 'metric';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'imperial' ? 'imperial' : 'metric';
  } catch {
    return 'metric';
  }
}

export function useUnits(): [UnitsPreference, (next: UnitsPreference) => void] {
  // Lazy init reads localStorage synchronously so the first render is
  // already correct (avoids a metric→imperial flicker on hydration).
  const [units, setUnitsState] = useState<UnitsPreference>(() => readStored());

  // Keep this hook's state in sync if the value changes in another
  // tab. Same-tab updates already flow through setUnits().
  useEffect(() => {
    function onStorage(e: StorageEvent): void {
      if (e.key !== STORAGE_KEY) return;
      setUnitsState(e.newValue === 'imperial' ? 'imperial' : 'metric');
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function setUnits(next: UnitsPreference): void {
    setUnitsState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* noop */
    }
  }

  return [units, setUnits];
}
