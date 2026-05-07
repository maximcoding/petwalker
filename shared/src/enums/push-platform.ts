export const PushPlatform = {
  Ios: 'ios',
  Android: 'android',
} as const;

export type PushPlatform = (typeof PushPlatform)[keyof typeof PushPlatform];

export const PUSH_PLATFORMS = ['ios', 'android'] as const satisfies readonly PushPlatform[];
