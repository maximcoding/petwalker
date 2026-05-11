/**
 * Barrel for layout primitives. Import from `@/components/layout`
 * rather than reaching into individual files — keeps refactors safe.
 */
export { Container, type ContainerProps } from './container';
export { Stack, type StackProps } from './stack';
export { Cluster, type ClusterProps } from './cluster';
export { Drawer, type DrawerProps } from './drawer';
export { Footer } from './footer';
export { Header } from './header';
export { MobileTopBar } from './mobile-top-bar';
export { BottomTabBar } from './bottom-tab-bar';
export { ResponsiveTopChrome, ResponsiveBottomChrome } from './responsive-nav';
export { buildNav, homeHref, isActive, type NavItem } from './nav';
