'use client';

import { UserRole } from '@petwalker/shared/enums';
import type { User } from '@petwalker/shared/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';


/**
 * The "active" UI mode for users with `role === 'both'`.
 *
 * - For pure `owner` users: the mode is locked to 'owner'.
 * - For pure `provider` users: the mode is locked to 'provider'.
 * - For `both` users: persisted in localStorage so a refresh keeps the
 *   chosen view. Default seed is whichever side they were last in; if
 *   nothing is stored, we default to 'owner' (the more common entry point).
 *
 * Important: this is a UI-only signal. The user's actual `role` on the
 * server is unchanged when toggling — switching modes should NOT call
 * `users.updateMe({ role })`. Use `RoleSection` in the profile for that.
 */
export type ViewMode = 'owner' | 'provider';

interface ViewModeContextValue {
  /** The currently active mode in the UI. */
  mode: ViewMode;
  /** True when the user can toggle (i.e. role === 'both'). */
  canToggle: boolean;
  /** True when the user is a provider in any capacity (provider or both). */
  isProvider: boolean;
  /** True when the user is an owner in any capacity (owner or both). */
  isOwner: boolean;
  /** Switch the active view mode. No-op if `canToggle` is false. */
  setMode: (next: ViewMode) => void;
  /** Convenience toggle between owner ↔ provider. */
  toggle: () => void;
}

const STORAGE_KEY = 'petwalker:viewMode';

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

function readStoredMode(): ViewMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'owner' || raw === 'provider' ? raw : null;
  } catch {
    return null;
  }
}

function deriveDefault(role: UserRole): ViewMode {
  if (role === UserRole.Provider) return 'provider';
  return 'owner'; // owner | both
}

interface Props {
  /** Current user. The provider mounts after sign-in so `me` is always present. */
  me: User;
}

export function ViewModeProvider({ me, children }: PropsWithChildren<Props>): JSX.Element {
  const canToggle = me.role === UserRole.Both;
  const isProvider = me.role === UserRole.Provider || me.role === UserRole.Both;
  const isOwner = me.role === UserRole.Owner || me.role === UserRole.Both;

  // Lazy init — read the stored mode once on mount so SSR and the initial
  // client render agree on a non-stored default; the stored value is then
  // applied via the effect below.
  const [mode, setModeState] = useState<ViewMode>(() => deriveDefault(me.role));

  useEffect(() => {
    if (!canToggle) {
      // Pure-role users: pin the mode to their role and clear any stale value.
      const next = deriveDefault(me.role);
      setModeState(next);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
      return;
    }
    const stored = readStoredMode();
    if (stored) setModeState(stored);
  }, [canToggle, me.role]);

  const setMode = useCallback(
    (next: ViewMode): void => {
      if (!canToggle) return;
      setModeState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* noop */
      }
    },
    [canToggle],
  );

  const toggle = useCallback((): void => {
    setMode(mode === 'owner' ? 'provider' : 'owner');
  }, [mode, setMode]);

  const value = useMemo<ViewModeContextValue>(
    () => ({ mode, canToggle, isProvider, isOwner, setMode, toggle }),
    [mode, canToggle, isProvider, isOwner, setMode, toggle],
  );

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

export function useViewMode(): ViewModeContextValue {
  const ctx = useContext(ViewModeContext);
  if (!ctx) {
    throw new Error('useViewMode must be used inside <ViewModeProvider>');
  }
  return ctx;
}
