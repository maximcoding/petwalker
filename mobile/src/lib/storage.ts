// Two-tier storage: SecureStore for sensitive tokens, AsyncStorage for everything else.
// (MMKV from the bare-RN starter requires native modules — not Expo-Go-compatible.
// Switch to MMKV later via expo-build-properties + a config plugin if perf becomes an issue.)

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  getItem: (key: string): Promise<string | null> => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> => SecureStore.setItemAsync(key, value),
  removeItem: (key: string): Promise<void> => SecureStore.deleteItemAsync(key),
};

export const kvStorage = {
  getItem: AsyncStorage.getItem,
  setItem: AsyncStorage.setItem,
  removeItem: AsyncStorage.removeItem,
};
