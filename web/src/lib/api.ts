'use client';

import { PetwalkerApi } from '@petwalker/shared/api';

import { getIdToken } from './auth';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = new PetwalkerApi({
  baseUrl,
  getToken: getIdToken,
});
