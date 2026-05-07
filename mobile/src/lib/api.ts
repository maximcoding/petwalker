import { PetwalkerApi } from '@petwalker/shared/api';
import Constants from 'expo-constants';

import { getIdToken } from './auth';

const baseUrl =
  ((Constants.expoConfig?.extra ?? {}) as { apiUrl?: string }).apiUrl ?? 'http://localhost:3001';

export const api = new PetwalkerApi({
  baseUrl,
  getToken: getIdToken,
});
