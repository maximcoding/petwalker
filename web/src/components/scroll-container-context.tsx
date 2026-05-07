'use client';

import { createContext, useContext } from 'react';

/**
 * The DOM element that should act as the scrollable parent for virtualized
 * lists (react-virtuoso's `customScrollParent`).
 *
 * AppLayout sets it to the `<main>` element so the header stays put while
 * grids scroll inside the content area.
 *
 * Returns `null` outside the provider — Virtuoso falls back to its default
 * (its own scroll container), which is also fine.
 */
export const ScrollContainerContext = createContext<HTMLElement | null>(null);

export function useScrollContainer(): HTMLElement | null {
  return useContext(ScrollContainerContext);
}
