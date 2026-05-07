import { BookingStatus } from '@petwalker/shared/enums';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PayButton } from '@/components/PayButton';
import { api } from '@/lib/api';

import type { Booking, User } from '@petwalker/shared/types';

const TABS: { value: BookingStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: BookingStatus.Pending, label: 'Pending' },
  { value: BookingStatus.Confirmed, label: 'Confirmed' },
  { value: BookingStatus.InProgress, label: 'Active' },
  { value: BookingStatus.Completed, label: 'Done' },
  { value: BookingStatus.Cancelled, label: 'Cancelled' },
];

const STATUS_COLOR: Record<BookingStatus, { bg: string; fg: string }> = {
  pending: { bg: '#fef3c7', fg: '#92400e' },
  confirmed: { bg: '#dbeafe', fg: '#1e40af' },
  in_progress: { bg: '#d1fae5', fg: '#065f46' },
  completed: { bg: '#e2e8f0', fg: '#334155' },
  cancelled: { bg: '#fee2e2', fg: '#991b1b' },
};

export default function Bookings(): JSX.Element {
  const [tab, setTab] = useState<BookingStatus | 'all'>('all');

  const me = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
  });

  const q = useInfiniteQuery({
    queryKey: ['bookings', tab],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.bookings.list({
        status: tab === 'all' ? undefined : tab,
        cursor: pageParam,
        limit: 20,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const items: Booking[] = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '600' }}>Bookings</Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => setTab(t.value)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: active ? '#4456f0' : '#f1f5f9',
              }}
            >
              <Text
                style={{
                  color: active ? 'white' : '#475569',
                  fontWeight: active ? '600' : '500',
                  fontSize: 13,
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {q.isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : q.error ? (
        <Text style={{ padding: 16, color: '#dc2626' }}>
          Error: {(q.error as Error).message}
        </Text>
      ) : items.length === 0 ? (
        <Text style={{ padding: 16, color: '#64748b' }}>
          No bookings {tab === 'all' ? 'yet' : `in "${tab.replace('_', ' ')}"`}.
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}
          renderItem={({ item }) =>
            me.data ? <BookingCard booking={item} meId={me.data.id} /> : null
          }
          refreshing={q.isFetching}
          onRefresh={q.refetch}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
        />
      )}
    </SafeAreaView>
  );
}

function BookingCard({
  booking,
  meId,
}: {
  booking: Booking;
  meId: string;
}): JSX.Element {
  const qc = useQueryClient();
  const router = useRouter();
  const isOwner = booking.ownerId === meId;
  const isProvider = booking.providerId === meId;

  const refresh = (): void => {
    void qc.invalidateQueries({ queryKey: ['bookings'] });
  };

  const confirm = useMutation({
    mutationFn: () => api.bookings.confirm(booking.id),
    onSuccess: refresh,
    onError: (e: Error) => Alert.alert('Confirm failed', e.message),
  });
  const start = useMutation({
    mutationFn: () => api.bookings.start(booking.id),
    onSuccess: refresh,
    onError: (e: Error) => Alert.alert('Start failed', e.message),
  });
  const end = useMutation({
    mutationFn: () => api.bookings.end(booking.id),
    onSuccess: refresh,
    onError: (e: Error) => Alert.alert('End failed', e.message),
  });
  const cancel = useMutation({
    mutationFn: () => api.bookings.cancel(booking.id),
    onSuccess: refresh,
    onError: (e: Error) => Alert.alert('Cancel failed', e.message),
  });

  const tone = STATUS_COLOR[booking.status];
  const busy =
    confirm.isPending || start.isPending || end.isPending || cancel.isPending;

  const buttons: { label: string; onPress: () => void; danger?: boolean }[] = [];
  if (isProvider && booking.status === BookingStatus.Pending) {
    buttons.push({ label: 'Confirm', onPress: () => confirm.mutate() });
  }
  if (isProvider && booking.status === BookingStatus.Confirmed) {
    buttons.push({
      label: 'Start',
      onPress: () => {
        start.mutate(undefined, {
          onSuccess: () =>
            router.push({ pathname: '/walks/active', params: { bookingId: booking.id } }),
        });
      },
    });
  }
  if (booking.status === BookingStatus.InProgress) {
    buttons.push({
      label: 'View live',
      onPress: () =>
        router.push({ pathname: '/walks/active', params: { bookingId: booking.id } }),
    });
  }
  if (isProvider && booking.status === BookingStatus.InProgress) {
    buttons.push({ label: 'End', onPress: () => end.mutate() });
  }
  if (
    (isOwner || isProvider) &&
    (booking.status === BookingStatus.Pending ||
      booking.status === BookingStatus.Confirmed)
  ) {
    buttons.push({ label: 'Cancel', danger: true, onPress: () => cancel.mutate() });
  }

  return (
    <View style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', textTransform: 'capitalize' }}>
          {booking.serviceType}
        </Text>
        <View
          style={{
            backgroundColor: tone.bg,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: tone.fg, fontSize: 11, fontWeight: '600' }}>
            {booking.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
      <Text style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
        {new Date(booking.scheduledAt).toLocaleString()} · {booking.durationMin} min · $
        {(booking.priceCents / 100).toFixed(2)}
      </Text>
      {booking.notes ? (
        <Text style={{ color: '#475569', fontSize: 13, marginTop: 6 }}>{booking.notes}</Text>
      ) : null}

      {buttons.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {buttons.map((b) => (
            <Pressable
              key={b.label}
              disabled={busy}
              onPress={b.onPress}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: b.danger ? '#fee2e2' : '#eef2ff',
              }}
            >
              <Text style={{ color: b.danger ? '#dc2626' : '#4456f0', fontWeight: '600' }}>
                {busy ? '…' : b.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Owner-side pay surface for any active booking (pending → confirmed
          via webhook on success). PayButton self-hides once status is final. */}
      {isOwner &&
      (booking.status === BookingStatus.Pending ||
        booking.status === BookingStatus.Confirmed) ? (
        <View style={{ marginTop: 10 }}>
          <PayButton bookingId={booking.id} />
        </View>
      ) : null}
    </View>
  );
}
