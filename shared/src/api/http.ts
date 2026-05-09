import type { ApiError } from '../types/common.js';

export type AuthTokenProvider = () => string | null | Promise<string | null>;

export interface HttpClientOptions {
  baseUrl: string;
  /** Returns the current access token (or null). Called per request. */
  getToken?: AuthTokenProvider;
  /** Override fetch (e.g. for tests). */
  fetch?: typeof fetch;
}

export class HttpError extends Error {
  readonly status: number;
  readonly body: ApiError | string | undefined;

  constructor(status: number, message: string, body?: ApiError | string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

interface RequestOpts {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Skip JSON parsing, return Response directly. */
  raw?: boolean;
}

export class HttpClient {
  private readonly opts: Required<Omit<HttpClientOptions, 'getToken'>> &
    Pick<HttpClientOptions, 'getToken'>;

  constructor(opts: HttpClientOptions) {
    this.opts = {
      baseUrl: opts.baseUrl.replace(/\/$/, ''),
      fetch: opts.fetch ?? globalThis.fetch.bind(globalThis),
      getToken: opts.getToken,
    };
  }

  get<T>(path: string, query?: RequestOpts['query']): Promise<T> {
    return this.request<T>({ method: 'GET', path, query });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: 'POST', path, body });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: 'PATCH', path, body });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: 'PUT', path, body });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>({ method: 'DELETE', path });
  }

  /**
   * GET that returns the raw response body as a Blob. Adds the auth
   * header like the JSON paths so endpoints behind CognitoGuard work.
   * Use for binary downloads (PDF, images, etc.) where JSON parsing
   * would corrupt the bytes.
   */
  async getBlob(path: string): Promise<Blob> {
    const url = new URL(this.opts.baseUrl + path);
    const headers: Record<string, string> = {};
    const token = await this.opts.getToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await this.opts.fetch(url.toString(), { method: 'GET', headers });
    if (!res.ok) {
      const body = await res.text().catch(() => undefined);
      throw new HttpError(res.status, res.statusText, body);
    }
    return res.blob();
  }

  private async request<T>(opts: RequestOpts): Promise<T> {
    const url = new URL(this.opts.baseUrl + opts.path);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

    const token = await this.opts.getToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await this.opts.fetch(url.toString(), {
      method: opts.method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

    if (!res.ok) {
      let body: ApiError | string | undefined;
      try {
        body = (await res.json()) as ApiError;
      } catch {
        body = await res.text().catch(() => undefined);
      }
      const msg =
        typeof body === 'object' && body && 'message' in body ? body.message : res.statusText;
      throw new HttpError(res.status, msg, body);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
}
