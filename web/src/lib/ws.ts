'use client';

import { getIdToken } from './auth';

const WS_BASE = (() => {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  return api.replace(/^http/, 'ws');
})();

export interface WsClientOptions<TServerEvent> {
  /** Path on the API host. e.g. `/ws/tracking` */
  path: string;
  /** Querystring params, e.g. { bookingId } */
  query?: Record<string, string>;
  /** Called whenever the server sends a JSON event. */
  onEvent: (event: TServerEvent) => void;
  /** Called once the socket is open + authed. Optional. */
  onOpen?: () => void;
  /** Called on close (auto-reconnect handles re-opening). Optional. */
  onClose?: (code: number, reason: string) => void;
  /** Override the WS base — handy in tests. */
  baseUrl?: string;
}

export interface WsClientHandle {
  /** Send a JSON-serialised event. No-op if not currently open. */
  send: (event: unknown) => void;
  /** Stop the auto-reconnect loop and close the socket. */
  close: () => void;
  /** Reflects current state — useful for status indicators. */
  isOpen: () => boolean;
}

/**
 * Auto-reconnecting WebSocket wrapper. JWT is refreshed (via Amplify) on every
 * reconnect attempt so an expired token doesn't stall the loop. Backoff is
 * 0.5s → 1s → 2s → … capped at 10s.
 *
 * Auth is via `Sec-WebSocket-Protocol: bearer.<jwt>` (the only way browsers
 * can attach a token to `new WebSocket(...)`).
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
      // Not signed in — back off and try again. Avoids a tight loop on logout.
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
        // ignore non-JSON frames
      }
    };
    socket.onclose = (e) => {
      opts.onClose?.(e.code, e.reason);
      socket = null;
      if (!stopped) scheduleReconnect();
    };
    socket.onerror = () => {
      // Let onclose drive reconnect.
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
      if (socket && socket.readyState === WebSocket.OPEN) {
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
      return socket?.readyState === WebSocket.OPEN;
    },
  };
}
