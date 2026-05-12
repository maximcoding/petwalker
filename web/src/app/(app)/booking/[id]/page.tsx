'use client';

import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CircleDot,
  Clock,
  MapPin,
  MessageCircle,
  Star,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type JSX } from 'react';

import {
  getActions,
  refundForCancellation,
  type BookingStatus,
  type LifecycleBooking,
} from '@/lib/booking-lifecycle';
import {
  BOOKINGS_BY_ID,
  CATEGORY_LABELS,
  PETS_BY_ID,
  PROVIDER_BY_ID,
  type MockBooking,
} from '@/lib/mock';

/**
 * Static class map for the status pill. Tailwind JIT can't resolve
 * interpolated class names; listing every status's static class
 * pair keeps the safelist working.
 */
const STATUS_PILL_CLASS: Record<BookingStatus, string> = {
  pending: 'bg-sunshine-100 text-sunshine-700',
  confirmed: 'bg-sky-100 text-sky-700',
  inProgress: 'bg-mint-100 text-mint-700',
  completed: 'bg-warm-100 text-warm-700',
  cancelled: 'bg-coral-100 text-coral-700',
};

/**
 * /booking/[id] — booking detail.
 *
 * Read-only view of an existing booking with state-machine-driven
 * actions (Cancel, Edit notes, Open live, etc.). Booking status pill
 * uses STATUS_HUE; action set comes from getActions(); destructive
 * cancel shows refund preview from refundForCancellation().
 *
 * Reads from in-memory mock first; falls back to GET /api/bookings/{id}
 * for newly-created bookings that landed via the wizard.
 *
 * Spec: docs/booking-flow-spec.md (Booking detail section).
 */
export default function BookingDetailPage(): JSX.Element {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const [booking, setBooking] = useState<MockBooking | null>(() => BOOKINGS_BY_ID[id] ?? null);
  const [loading, setLoading] = useState(!booking);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    if (booking || !id) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/bookings/${id}`);
        if (!res.ok) throw new Error('Booking not found');
        const data = (await res.json()) as MockBooking;
        if (mounted) setBooking({ ...data, scheduledAt: new Date(data.scheduledAt), createdAt: new Date(data.createdAt) });
      } catch {
        if (mounted) router.replace('/bookings');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, booking, router]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-ink-secondary">Booking not found.</p>
        <Link href="/bookings" className="mt-4 text-sm text-ink-link hover:underline">
          Back to bookings
        </Link>
      </div>
    );
  }

  const provider = PROVIDER_BY_ID[booking.providerId];
  const pet = booking.petIds[0] ? PETS_BY_ID[booking.petIds[0]] : null;

  const lifecycle: LifecycleBooking = {
    id: booking.id,
    ownerId: booking.ownerId,
    providerId: booking.providerId,
    status: booking.status,
    createdAt: booking.createdAt,
    scheduledAt: booking.scheduledAt,
    durationMin: booking.durationMin,
    totalCents: booking.totalCents,
    platformFeeCents: booking.platformFeeCents,
  };

  const actions = getActions(lifecycle, 'owner');
  const pillCls = STATUS_PILL_CLASS[booking.status];

  async function handleConfirmCancel(): Promise<void> {
    setCancelOpen(false);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) throw new Error('Cancel failed');
      setBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
    } catch {
      // No-op for stub — real error surfacing in M-Backend-handshake.
    }
  }

  return (
    <div className="relative min-h-screen bg-surface-base pb-32">
      {/* Top bar */}
      <header className="sticky top-0 z-sticky border-b border-border-subtle bg-surface-base/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/bookings"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Link>
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary">
            Booking #{booking.id.slice(-6).toUpperCase()}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6 sm:px-6">
        {/* Hero */}
        <section className="rounded-3xl bg-gradient-sunset p-6 text-ink-inverse">
          <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${pillCls}`}>
            <CircleDot className="h-3 w-3" aria-hidden />
            {humanStatus(booking.status)}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {CATEGORY_LABELS[booking.serviceCategory]} with {provider?.name ?? 'your provider'}
          </h1>
          <p className="mt-1 text-sm text-ink-inverse/90">
            <Calendar className="me-1.5 inline h-4 w-4 align-text-bottom" aria-hidden />
            {formatScheduled(booking.scheduledAt)} · {booking.durationMin} min
          </p>
        </section>

        {/* Provider */}
        {provider && (
          <section className="rounded-2xl border border-border-subtle bg-surface-raised p-4">
            <div className="flex items-center gap-3">
              <Image
                src={provider.avatar}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 rounded-full object-cover"
                unoptimized
              />
              <div className="flex-1">
                <p className="text-base font-bold text-ink-primary">{provider.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-secondary">
                  <Star className="h-3 w-3 fill-sunshine-400 text-sunshine-500" aria-hidden />
                  {provider.rating.toFixed(2)} · {provider.reviewCount} reviews
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-border-default bg-surface-raised px-3 py-1.5 text-xs font-semibold text-ink-primary hover:bg-warm-50"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                  Message
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Pet */}
        {pet && (
          <section className="rounded-2xl border border-border-subtle bg-surface-raised p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">Pet</p>
            <div className="mt-2 flex items-center gap-3">
              {pet.photo && (
                <Image
                  src={pet.photo}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover"
                  unoptimized
                />
              )}
              <div>
                <p className="text-sm font-bold text-ink-primary">{pet.name}</p>
                <p className="mt-0.5 text-xs text-ink-secondary">{pet.breed}</p>
              </div>
            </div>
            {booking.notes && (
              <div className="mt-3 rounded-lg bg-warm-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
                  Care notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs text-ink-secondary">{booking.notes}</p>
              </div>
            )}
          </section>
        )}

        {/* Where */}
        <section className="rounded-2xl border border-border-subtle bg-surface-raised p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">Where</p>
          <p className="mt-2 flex items-start gap-2 text-sm text-ink-primary">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-tertiary" aria-hidden />
            {booking.accommodation === 'atOwnerHome' && 'At your home'}
            {booking.accommodation === 'atProviderLocation' && (provider ? `At ${provider.name}'s place` : 'At provider')}
            {booking.accommodation === 'atCustomAddress' && 'At a meeting point'}
          </p>
        </section>

        {/* Price */}
        <section className="rounded-2xl border border-border-subtle bg-surface-raised p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">Price</p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-secondary">Base</dt>
              <dd className="text-ink-primary">${((booking.totalCents - booking.platformFeeCents) / 100).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-secondary">Service fee</dt>
              <dd className="text-ink-primary">${(booking.platformFeeCents / 100).toFixed(2)}</dd>
            </div>
            <div className="my-1.5 border-t border-border-subtle" />
            <div className="flex justify-between">
              <dt className="font-bold text-ink-primary">Total</dt>
              <dd className="font-bold text-ink-primary">${(booking.totalCents / 100).toFixed(2)}</dd>
            </div>
          </dl>
        </section>

        {/* Timeline */}
        <BookingTimeline booking={booking} />
      </main>

      {/* Action footer */}
      <ActionFooter
        actions={actions}
        onCancel={() => setCancelOpen(true)}
      />

      {/* Cancellation confirm sheet */}
      {cancelOpen && (
        <CancelConfirmSheet
          lifecycle={lifecycle}
          onClose={() => setCancelOpen(false)}
          onConfirm={handleConfirmCancel}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Timeline
// ──────────────────────────────────────────────────────────────────

function BookingTimeline({ booking }: { booking: MockBooking }): JSX.Element {
  const events = useMemo(() => {
    const out: { label: string; at: Date; icon: JSX.Element }[] = [];
    out.push({
      label: 'Booking requested',
      at: booking.createdAt,
      icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
    });
    if (booking.status !== 'pending') {
      out.push({
        label: 'Confirmed',
        at: new Date(booking.createdAt.getTime() + 5 * 60_000),
        icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
      });
    }
    if (booking.status === 'inProgress' || booking.status === 'completed') {
      out.push({
        label: 'Walk started',
        at: booking.scheduledAt,
        icon: <Clock className="h-4 w-4" aria-hidden />,
      });
    }
    if (booking.status === 'completed') {
      out.push({
        label: 'Walk completed',
        at: new Date(booking.scheduledAt.getTime() + booking.durationMin * 60_000),
        icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
      });
    }
    if (booking.status === 'cancelled') {
      out.push({
        label: 'Cancelled',
        at: new Date(),
        icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
      });
    }
    return out;
  }, [booking]);

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-raised p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">Timeline</p>
      <ol className="mt-3 space-y-3">
        {events.map((e, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              {e.icon}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-ink-primary">{e.label}</p>
              <p className="text-xs text-ink-tertiary">{formatTimestamp(e.at)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// Action footer (sticky)
// ──────────────────────────────────────────────────────────────────

function ActionFooter({
  actions,
  onCancel,
}: {
  actions: ReturnType<typeof getActions>;
  onCancel: () => void;
}): JSX.Element | null {
  if (actions.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-border-subtle bg-surface-base/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-end gap-2 px-4 py-3 sm:px-6">
        {actions.map((a) => {
          const onClick = a.id === 'cancel' ? onCancel : undefined;
          const baseCls =
            'inline-flex min-h-touch items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-colors';
          const kindCls =
            a.kind === 'primary'
              ? 'bg-brand-600 text-ink-inverse hover:bg-brand-700'
              : a.kind === 'destructive'
                ? 'border border-coral-300 bg-surface-raised text-coral-700 hover:bg-coral-50'
                : a.kind === 'secondary'
                  ? 'border border-border-default bg-surface-raised text-ink-primary hover:bg-warm-50'
                  : 'text-ink-link hover:underline';
          return (
            <button
              key={a.id}
              type="button"
              onClick={onClick}
              disabled={!a.enabled}
              className={`${baseCls} ${kindCls} disabled:cursor-not-allowed disabled:opacity-50`}
              title={a.disabledReason}
            >
              {a.defaultLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Cancel confirm — bottom sheet with refund preview
// ──────────────────────────────────────────────────────────────────

function CancelConfirmSheet({
  lifecycle,
  onClose,
  onConfirm,
}: {
  lifecycle: LifecycleBooking;
  onClose: () => void;
  onConfirm: () => void;
}): JSX.Element {
  const refund = useMemo(
    () => refundForCancellation(lifecycle, 'owner', new Date(), { providerNoShowFeeCents: 0 }),
    [lifecycle],
  );

  // Owner cancellation refund-policy summary, used as `refund.reason`
  // below — the lifecycle returns numbers, the UI provides the prose.
  const refundReason = useMemo(() => {
    const msToStart = lifecycle.scheduledAt.getTime() - Date.now();
    const hours = Math.max(0, Math.round(msToStart / (60 * 60_000)));
    if (refund.refundCents >= lifecycle.totalCents) {
      return `Cancelling more than 2 hours before the start time — full refund (~${hours} hr remaining).`;
    }
    return `Less than 2 hours to the start time — service fee retained, base rate refundable depending on provider policy.`;
  }, [refund, lifecycle]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-title"
      className="fixed inset-0 z-modal flex items-end justify-center bg-ink-primary/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-surface-raised p-6 shadow-overlay sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="cancel-title" className="text-xl font-extrabold tracking-tight text-ink-primary">
          Cancel this booking?
        </h2>
        <p className="mt-2 text-sm text-ink-secondary">
          You can cancel anytime. Your refund depends on how close the start time is.
        </p>

        <div className="mt-5 rounded-2xl bg-warm-50 p-4">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-secondary">Total paid</dt>
              <dd className="text-ink-primary">${(lifecycle.totalCents / 100).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-secondary">Refund</dt>
              <dd className="font-bold text-ink-primary">${(refund.refundCents / 100).toFixed(2)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-ink-tertiary">{refundReason}</p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-touch flex-1 items-center justify-center rounded-lg border border-border-default bg-surface-raised text-sm font-semibold text-ink-primary hover:bg-warm-50"
          >
            Keep booking
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-touch flex-1 items-center justify-center rounded-lg bg-coral-600 text-sm font-semibold text-ink-inverse hover:bg-coral-700"
          >
            Cancel booking
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Skeleton & helpers
// ──────────────────────────────────────────────────────────────────

function DetailSkeleton(): JSX.Element {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6 sm:px-6">
      <div className="h-32 animate-pulse rounded-3xl bg-warm-100" />
      <div className="h-20 animate-pulse rounded-2xl bg-warm-100" />
      <div className="h-20 animate-pulse rounded-2xl bg-warm-100" />
    </div>
  );
}

function humanStatus(s: BookingStatus): string {
  return s === 'inProgress' ? 'In progress' : s.charAt(0).toUpperCase() + s.slice(1);
}

function formatScheduled(d: Date): string {
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTimestamp(d: Date): string {
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
