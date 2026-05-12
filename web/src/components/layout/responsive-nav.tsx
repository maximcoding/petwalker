'use client';

import type { User } from '@petwalker/shared/types';
import type { JSX } from 'react';

import { BottomTabBar } from './bottom-tab-bar';
import { Header } from './header';
import { MobileTopBar } from './mobile-top-bar';

interface Props {
  me: User;
}

/**
 * ResponsiveNav — renders the App Shell chrome. Two parallel trees
 * (CSS-toggled, no media-query JS):
 *
 *   < md  →  <MobileTopBar /> ... <BottomTabBar />
 *   ≥ md  →  <Header />
 *
 * The bottom tab bar lives at the *end* of the App Shell tree so it
 * pins to the viewport bottom; pass the `<BottomTabBar />` element by
 * rendering this component's `bottom` slot in the right spot.
 *
 * Usage:
 *   const { topChrome, bottomChrome } = useAppChrome(me);
 *   return <Shell top={topChrome} bottom={bottomChrome}>{children}</Shell>;
 *
 * For convenience, the helpers below compose the top + bottom chrome
 * elements separately so the App Shell can place them in flex order.
 */
export function ResponsiveTopChrome({ me }: Props): JSX.Element {
  return (
    <>
      <div className="md:hidden">
        <MobileTopBar me={me} />
      </div>
      <div className="hidden md:block">
        <Header me={me} />
      </div>
    </>
  );
}

export function ResponsiveBottomChrome(): JSX.Element {
  return (
    <div className="md:hidden">
      <BottomTabBar />
    </div>
  );
}
