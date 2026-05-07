import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '@/lib/api';
import { createWsClient, type WsClientHandle } from '@/lib/ws';

import type { Message, WsChatServerEvent } from '@petwalker/shared';

interface Props {
  bookingId: string;
  meId: string;
}

export function ChatPanel({ bookingId, meId }: Props): JSX.Element {
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const [live, setLive] = useState<Message[]>([]);
  const wsRef = useRef<WsClientHandle | null>(null);

  const history = useInfiniteQuery({
    queryKey: ['messages', bookingId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.bookings.messages(bookingId, { cursor: pageParam, limit: 50 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const all: Message[] = useMemo(() => {
    const fromHistory = (history.data?.pages.flatMap((p) => p.items) ?? [])
      .slice()
      .reverse();
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

  function send(): void {
    const body = draft.trim();
    if (!body) return;
    if (wsRef.current?.isOpen()) {
      wsRef.current.send({ type: 'chat:send', bookingId, body });
    } else {
      void api.bookings
        .sendMessage(bookingId, { body })
        .then((m) => setLive((prev) => [...prev, m]));
    }
    setDraft('');
  }

  return (
    <View style={{ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderColor: '#e2e8f0',
        }}
      >
        <Text style={{ fontWeight: '600' }}>Chat</Text>
        <Text style={{ fontSize: 11, color: connected ? '#059669' : '#94a3b8' }}>
          {connected ? '● live' : '○ offline'}
        </Text>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 10, gap: 6 }}
        data={all}
        keyExtractor={(m) => m.id}
        ListHeaderComponent={
          history.hasNextPage ? (
            <Pressable
              onPress={() => void history.fetchNextPage()}
              style={{ alignItems: 'center', padding: 6 }}
            >
              <Text style={{ color: '#64748b', fontSize: 12 }}>
                {history.isFetchingNextPage ? 'Loading…' : 'Load older'}
              </Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          history.isLoading ? (
            <ActivityIndicator />
          ) : (
            <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 16 }}>
              No messages yet.
            </Text>
          )
        }
        renderItem={({ item: m }) => {
          const mine = m.senderId === meId;
          return (
            <View
              style={{
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 14,
                backgroundColor: mine ? '#4456f0' : '#f1f5f9',
              }}
            >
              <Text style={{ color: mine ? 'white' : '#0f172a', fontSize: 14 }}>{m.body}</Text>
              <Text
                style={{
                  marginTop: 2,
                  fontSize: 10,
                  color: mine ? 'rgba(255,255,255,0.85)' : '#64748b',
                }}
              >
                {new Date(m.sentAt).toLocaleTimeString()}
              </Text>
            </View>
          );
        }}
      />

      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          padding: 10,
          borderTopWidth: 1,
          borderColor: '#e2e8f0',
        }}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message…"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#cbd5e1',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}
          onSubmitEditing={send}
        />
        <Pressable
          onPress={send}
          style={{
            backgroundColor: '#4456f0',
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}
