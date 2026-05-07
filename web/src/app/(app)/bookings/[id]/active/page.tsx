'use client';

import { BookingStatus } from '@petwalker/shared/enums';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChatPanel } from '@/components/chat-panel';
import { ScrollPage } from '@/components/scroll-page';
import { Button } from '@/components/ui/button';
import { WalkTrail } from '@/components/walk-trail';
import { api } from '@/lib/api';
import { createWsClient } from '@/lib/ws';

import type {
  Booking,
  GeoSample,
  User,
  Walk,
  WsTrackingServerEvent,
} from '@petwalker/shared';

export default function ActiveWalkPage(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const me = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
  });
  const booking = useQuery<Booking>({
    queryKey: ['booking', id],
    queryFn: () => api.bookings.get(id),
    enabled: Boolean(id),
  });
  const walk = useQuery<Walk>({
    queryKey: ['walk', id],
    queryFn: () => api.bookings.walk(id),
    enabled:
      Boolean(id) &&
      (booking.data?.status === BookingStatus.InProgress ||
        booking.data?.status === BookingStatus.Completed),
  });

  const [liveSamples, setLiveSamples] = useState<GeoSample[]>([]);
  const [endedAt, setEndedAt] = useState<string | null>(null);
  const [distanceM, setDistanceM] = useState<number | null>(null);

  // Hydrate from REST once it loads.
  useEffect(() => {
    if (walk.data?.polyline) setLiveSamples(walk.data.polyline);
    if (walk.data?.endedAt) setEndedAt(walk.data.endedAt);
    if (walk.data?.distanceM != null) setDistanceM(walk.data.distanceM);
  }, [walk.data]);

  // Subscribe for real-time updates while the walk is in progress.
  useEffect(() => {
    if (!id) return;
    if (booking.data?.status !== BookingStatus.InProgress) return;

    const ws = createWsClient<WsTrackingServerEvent>({
      path: '/ws/tracking',
      query: { bookingId: id },
      onEvent: (evt) => {
        if (evt.type === 'tracking:sample') {
          setLiveSamples((prev) => {
            // Dedupe by t — server may also broadcast the buffer flush.
            if (prev.some((s) => s.t === evt.sample.t)) return prev;
            return [...prev, evt.sample].sort((a, b) => a.t - b.t);
          });
        } else if (evt.type === 'tracking:ended') {
          setEndedAt(evt.endedAt);
          setDistanceM(evt.distanceM);
          void qc.invalidateQueries({ queryKey: ['booking', id] });
          void qc.invalidateQueries({ queryKey: ['walk', id] });
        }
      },
    });
    return () => ws.close();
  }, [id, booking.data?.status, qc]);

  const endWalk = useMutation({
    mutationFn: () => api.bookings.end(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['booking', id] });
      void qc.invalidateQueries({ queryKey: ['walk', id] });
    },
  });

  if (!id) {
    return (
      <ScrollPage>
        <p>Missing booking id.</p>
      </ScrollPage>
    );
  }
  if (booking.isLoading || me.isLoading) {
    return (
      <ScrollPage>
        <p className="text-sm text-slate-500">Loading…</p>
      </ScrollPage>
    );
  }
  if (booking.error) {
    return (
      <ScrollPage>
        <p className="text-sm text-red-600">Error: {(booking.error as Error).message}</p>
      </ScrollPage>
    );
  }
  if (!booking.data || !me.data) {
    return (
      <ScrollPage>
        <p className="text-sm text-slate-500">Not found.</p>
      </ScrollPage>
    );
  }

  const b = booking.data;
  const isProvider = me.data.id === b.providerId;
  const inProgress = b.status === BookingStatus.InProgress;

  return (
    <ScrollPage>
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href={`/bookings/${b.id}` as never} className="text-sm text-slate-500 hover:underline">
            ← Back to booking
          </Link>
          {isProvider && inProgress ? (
            <Button
              variant="danger"
              disabled={endWalk.isPending}
              onClick={() => endWalk.mutate()}
            >
              {endWalk.isPending ? 'Ending…' : 'End walk'}
            </Button>
          ) : null}
        </div>

        <header>
          <h1 className="text-2xl font-semibold">{t(`services.${b.serviceType}`)}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {inProgress
              ? 'Live tracking — pings update as the provider moves.'
              : endedAt
                ? `Ended ${new Date(endedAt).toLocaleString()}`
                : 'Walk is not in progress.'}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <WalkTrail samples={liveSamples} />
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Pings" value={String(liveSamples.length)} />
              <Stat
                label="Distance"
                value={
                  distanceM != null
                    ? `${(distanceM / 1000).toFixed(2)} km`
                    : liveSamples.length > 1
                      ? `${(estimateDistance(liveSamples) / 1000).toFixed(2)} km`
                      : '—'
                }
              />
              <Stat
                label="Elapsed"
                value={elapsed(walk.data?.startedAt, endedAt) ?? '—'}
              />
            </div>
          </div>

          <ChatPanel bookingId={b.id} meId={me.data.id} />
        </div>
      </section>
    </ScrollPage>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
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
  // Lightweight haversine sum — duplicates Polyline.distanceM() but avoids
  // pulling the class onto the live render path for trivial counts.
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
