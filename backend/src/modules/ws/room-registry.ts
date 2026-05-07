import type { WebSocket } from 'ws';

/**
 * Tiny in-memory pub/sub. One instance per gateway (tracking, chat). Holds
 * a Set<WebSocket> per room name. Send a JSON event with `broadcast(room, evt)`
 * — it serialises once and writes to every live socket. Sockets that throw
 * on send (closed mid-flight) are silently removed.
 *
 * No Redis fanout in M3. M6 swaps this for a Redis-backed implementation
 * with the same surface so multi-instance backends Just Work.
 */
export class RoomRegistry {
  private rooms = new Map<string, Set<WebSocket>>();

  join(room: string, socket: WebSocket): void {
    let set = this.rooms.get(room);
    if (!set) {
      set = new Set();
      this.rooms.set(room, set);
    }
    set.add(socket);
  }

  leave(room: string, socket: WebSocket): void {
    const set = this.rooms.get(room);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) this.rooms.delete(room);
  }

  broadcast(room: string, payload: unknown): void {
    const set = this.rooms.get(room);
    if (!set) return;
    const text = JSON.stringify(payload);
    for (const sock of set) {
      try {
        sock.send(text);
      } catch {
        set.delete(sock);
      }
    }
  }

  size(room: string): number {
    return this.rooms.get(room)?.size ?? 0;
  }
}
