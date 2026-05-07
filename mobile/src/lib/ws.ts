import Constants from 'expo-constants';

import { getIdToken } from './auth';

const WS_BASE = (() => {
  const api =
    ((Constants.expoConfig?.extra ?? {}) as { apiUrl?: string }).apiUrl ??
    'http://localhost:3001';
  return api.replace(/^http/, 'ws');
})();

export interface WsClientOptions<TServerEvent> {
  path: string;
  query?: Record<string, string>;
  onEvent: (event: TServerEvent) => void;
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  baseUrl?: string;
}

export interface WsClientHandle {
  send: (event: unknown) => void;
  close: () => void;
  isOpen: () => boolean;
}

/**
 * RN-friendly auto-reconnecting WebSocket. Same shape as web's lib/ws.ts so
 * shared event handlers from @petwalker/shared work identically across clients.
 *
 * Subprotocol-based JWT auth (`bearer.<jwt>`) — RN's WebSocket honours the
 * second arg the same way browsers do.
 */
export function createWsClient<TServerEvent>(
  opts: WsClientOptions<TServerEvent>,
): WsClientHandle {
  const base = opts.baseUrl ?? WS_BASE;
  const qs = new URLSearchParams(opts.query ?? {}).toString();
  const url = `${base}${opts.path}${qs ? `?${qs}` : ''}`;

  let socket: WebSocket | null = null;
  let stopped = false;
  let attempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  async function connect(): Promise<void> {
    if (stopped) return;
    const token = await getIdToken();
    if (!token) {
      scheduleReconnect();
      return;
    }
    try {
      socket = new WebSocket(url, [`bearer.${token}`]);
    } catch {
      scheduleReconnect();
      return;
    }
    socket.onopen = () => {
      attempt = 0;
      opts.onOpen?.();
    };
    socket.onmessage = (e) => {
      try {
        const evt = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data)) as TServerEvent;
        opts.onEvent(evt);
      } catch {
        // ignore non-JSON
      }
    };
    socket.onclose = (e) => {
      opts.onClose?.(e.code, e.reason);
      socket = null;
      if (!stopped) scheduleReconnect();
    };
    socket.onerror = () => {
      // onclose drives reconnect
    };
  }

  function scheduleReconnect(): void {
    if (reconnectTimer) return;
    const delay = Math.min(10_000, 500 * 2 ** attempt);
    attempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, delay);
  }

  void connect();

  return {
    send(event) {
      if (socket && socket.readyState === 1 /* WebSocket.OPEN */) {
        socket.send(JSON.stringify(event));
      }
    },
    close() {
      stopped = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket?.close();
      socket = null;
    },
    isOpen() {
      return socket?.readyState === 1;
    },
  };
}
