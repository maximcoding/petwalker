'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { createWsClient } from '@/lib/ws';

import type { Message, WsChatServerEvent } from '@petwalker/shared';

interface Props {
  bookingId: string;
  meId: string;
  height?: number;
}

export function ChatPanel({ bookingId, meId, height = 360 }: Props): JSX.Element {
  const qc = useQueryClient();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState('');
  const wsRef = useRef<ReturnType<typeof createWsClient<WsChatServerEvent>> | null>(null);
  const [connected, setConnected] = useState(false);

  // History — DESC pages from the API. We render in chronological order.
  const history = useInfiniteQuery({
    queryKey: ['messages', bookingId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.bookings.messages(bookingId, { cursor: pageParam, limit: 50 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  // Live append from WS — store in a separate slice and merge on render.
  const [live, setLive] = useState<Message[]>([]);

  const all: Message[] = useMemo(() => {
    const fromHistory = (history.data?.pages.flatMap((p) => p.items) ?? []).slice().reverse();
    // Dedupe by id; live can overlap history if the user reconnects mid-flight.
    const seen = new Set(fromHistory.map((m) => m.id));
    const merged = [...fromHistory];
    for (const m of live) {
      if (!seen.has(m.id)) {
        merged.push(m);
        seen.add(m.id);
      }
    }
    return merged;
  }, [history.data, live]);

  useEffect(() => {
    if (!bookingId) return;
    const ws = createWsClient<WsChatServerEvent>({
      path: '/ws/chat',
      query: { bookingId },
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onEvent: (evt) => {
        if (evt.type === 'chat:message') {
          setLive((prev) => [...prev, evt.message]);
          // Keep React Query cache in sync too — page 0 grows with new items.
          void qc.invalidateQueries({ queryKey: ['messages', bookingId] });
        }
      },
    });
    wsRef.current = ws;
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [bookingId, qc]);

  // Auto-scroll to bottom on new message (unless the user has scrolled up).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [all.length]);

  function send(): void {
    const body = draft.trim();
    if (!body) return;
    if (!wsRef.current?.isOpen()) {
      // Fallback to REST when WS isn't open.
      void api.bookings.sendMessage(bookingId, { body }).then((m) => {
        setLive((prev) => [...prev, m]);
      });
    } else {
      wsRef.current.send({ type: 'chat:send', bookingId, body });
    }
    setDraft('');
  }

  return (
    <div
      style={{ height }}
      className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <p className="text-sm font-medium">Chat</p>
        <span
          className={
            connected
              ? 'text-xs text-emerald-600'
              : 'text-xs text-slate-500'
          }
        >
          {connected ? '● live' : '○ offline'}
        </span>
      </div>

      <div ref={scrollerRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {history.hasNextPage ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void history.fetchNextPage()}
              className="text-xs text-slate-500 hover:underline"
            >
              {history.isFetchingNextPage ? 'Loading…' : 'Load older'}
            </button>
          </div>
        ) : null}
        {all.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No messages yet.</p>
        ) : (
          all.map((m) => {
            const mine = m.senderId === meId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={[
                    'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                    mine
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
                  ].join(' ')}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? 'text-white/80' : 'text-slate-500'}`}>
                    {new Date(m.sentAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2 border-t border-slate-200 px-3 py-2 dark:border-slate-800">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a message…"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <Button onClick={send}>Send</Button>
      </div>
    </div>
  );
}
