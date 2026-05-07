import { BookingStatus } from '@petwalker/shared/enums';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatPanel } from '@/components/ChatPanel';
import { api } from '@/lib/api';
import { startWalkTracking, stopWalkTracking } from '@/lib/walk-tracking';
import { createWsClient, type WsClientHandle } from '@/lib/ws';

import type {
  Booking,
  GeoSample,
  TrackingPingEvent,
  User,
  Walk,
  WsTrackingServerEvent,
} from '@petwalker/shared';

export default function ActiveWalk(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const me = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
  });
  const booking = useQuery<Booking>({
    queryKey: ['booking', bookingId],
    queryFn: () => api.bookings.get(bookingId!),
    enabled: Boolean(bookingId),
  });
  const walk = useQuery<Walk>({
    queryKey: ['walk', bookingId],
    queryFn: () => api.bookings.walk(bookingId!),
    enabled:
      Boolean(bookingId) &&
      (booking.data?.status === BookingStatus.InProgress ||
        booking.data?.status === BookingStatus.Completed),
  });

  const [samples, setSamples] = useState<GeoSample[]>([]);
  const [endedAt, setEndedAt] = useState<string | null>(null);
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const wsRef = useRef<WsClientHandle | null>(null);

  const isProvider = me.data?.id === booking.data?.providerId;
  const inProgress = booking.data?.status === BookingStatus.InProgress;

  // Hydrate from REST.
  useEffect(() => {
    if (walk.data?.polyline) setSamples(walk.data.polyline);
    if (walk.data?.endedAt) setEndedAt(walk.data.endedAt);
    if (walk.data?.distanceM != null) setDistanceM(walk.data.distanceM);
  }, [walk.data]);

  // Open the tracking WS while in progress.
  useEffect(() => {
    if (!bookingId || !inProgress) return;
    const ws = createWsClient<WsTrackingServerEvent>({
      path: '/ws/tracking',
      query: { bookingId },
      onEvent: (evt) => {
        if (evt.type === 'tracking:sample') {
          setSamples((prev) => {
            if (prev.some((s) => s.t === evt.sample.t)) return prev;
            return [...prev, evt.sample].sort((a, b) => a.t - b.t);
          });
        } else if (evt.type === 'tracking:ended') {
          setEndedAt(evt.endedAt);
          setDistanceM(evt.distanceM);
          void qc.invalidateQueries({ queryKey: ['booking', bookingId] });
          void qc.invalidateQueries({ queryKey: ['walk', bookingId] });
        }
      },
    });
    wsRef.current = ws;
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [bookingId, inProgress, qc]);

  // Provider-only: start native GPS streaming, push pings via WS.
  useEffect(() => {
    if (!isProvider || !inProgress || !walk.data?.id) return;
    let stopped = false;
    void (async () => {
      const ok = await startWalkTracking((sample) => {
        if (stopped) return;
        const evt: TrackingPingEvent = {
          type: 'tracking:ping',
          walkId: walk.data!.id,
          sample,
        };
        wsRef.current?.send(evt);
      });
      if (!ok) {
        Alert.alert(
          'Location permission required',
          'Grant location access so the owner can see your live position.',
        );
      }
    })();
    return () => {
      stopped = true;
      void stopWalkTracking();
    };
  }, [isProvider, inProgress, walk.data?.id]);

  const endWalk = useMutation({
    mutationFn: () => api.bookings.end(bookingId!),
    onSuccess: () => {
      void stopWalkTracking();
      void qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      void qc.invalidateQueries({ queryKey: ['walk', bookingId] });
    },
    onError: (e: Error) => Alert.alert('End failed', e.message),
  });

  if (booking.isLoading || me.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  if (!booking.data || !me.data) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 24 }}>
        <Text>Not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ padding: 16, gap: 4 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#64748b' }}>← Back</Text>
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: '600', textTransform: 'capitalize' }}>
          {booking.data.serviceType} walk
        </Text>
        <Text style={{ color: '#64748b' }}>
          {inProgress
            ? 'Live — pings stream as the provider moves.'
            : endedAt
              ? `Ended ${new Date(endedAt).toLocaleString()}`
              : 'Walk is not in progress.'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
        <Stat label="Pings" value={String(samples.length)} />
        <Stat
          label="Distance"
          value={
            distanceM != null
              ? `${(distanceM / 1000).toFixed(2)} km`
              : samples.length > 1
                ? `${(estimateDistance(samples) / 1000).toFixed(2)} km`
                : '—'
          }
        />
        <Stat label="Elapsed" value={elapsed(walk.data?.startedAt, endedAt) ?? '—'} />
      </View>

      {isProvider && inProgress ? (
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <Pressable
            onPress={() => endWalk.mutate()}
            disabled={endWalk.isPending}
            style={{
              backgroundColor: endWalk.isPending ? '#94a3b8' : '#dc2626',
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              {endWalk.isPending ? 'Ending…' : 'End walk'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ flex: 1, padding: 16 }}>
        <ChatPanel bookingId={booking.data.id} meId={me.data.id} />
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 11 }}>{label}</Text>
      <Text style={{ fontWeight: '600', marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function elapsed(startedAt: string | null | undefined, endedAt: string | null): string | null {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const ms = Math.max(0, end - start);
  const min = Math.floor(ms / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  return `${min}m ${sec}s`;
}

function estimateDistance(samples: GeoSample[]): number {
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    total += haversine(a.lat, a.lng, b.lat, b.lng);
  }
  return Math.round(total);
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
