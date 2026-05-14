'use client';

import { BookingStatus } from '@petwalker/shared/enums';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, CheckCircle2, Clock, Home, MapPin, MessageCircle, PawPrint, Star } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { LeaveReviewForm } from '@/components/leave-review-form';
import { PaymentBlock } from '@/components/payment-block';
import { ScrollPage } from '@/components/scroll-page';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { PageLoading, Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { previewCancellation } from '@/lib/cancellation-preview';
import { prettifyError } from '@/lib/prettify-error';

import type { Booking, Pet, ServiceProviderDetail, User } from '@petwalker/shared/types';

/**
 * /bookings/[id] — booking detail.
 *
 * Redesigned per docs/booking-flow-spec.md:
 *  • Gradient hero with status pill (STATUS_PILL_CLASS)
 *  • Stacked detail cards (when · duration · price · notes · payment)
 *  • Timeline of state events synthesized from booking timestamps
 *  • Sticky action footer with role-aware buttons
 *  • Cancel confirms via useConfirm + previewCancellation()
 *
 * Data layer is unchanged:
 *  • useQuery hits api.bookings.get(id)
 *  • Mutations call api.bookings.{confirm,start,end,cancel}(id)
 *  • PaymentBlock, LeaveReviewForm, ErrorState, PageLoading reused
 *
 * No parallel implementation — this IS the booking detail.
 */

function fmtMoney(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Static status → pill-class lookup. JIT-safe (no interpolated class
 * names). Each status maps to a (bg, text) pair from the M1 palette.
 */
const STATUS_PILL_CLASS: Record<BookingStatus, string> = {
  pending: 'bg-sunshine-100 text-sunshine-800',
  confirmed: 'bg-sky-100 text-sky-800',
  in_progress: 'bg-mint-100 text-mint-800',
  completed: 'bg-warm-200 text-warm-800',
  cancelled: 'bg-coral-100 text-coral-800',
};

function statusKey(s: BookingStatus): 'pending' | 'confirmed' | 'inProgress' | 'completed' | 'cancelled' {
  if (s === 'in_progress') return 'inProgress';
  return s;
}

export default function BookingDetailPage(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const confirmDialog = useConfirm();

  const me = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
  });
  const q = useQuery<Booking>({
    queryKey: ['booking', id],
    queryFn: () => api.bookings.get(id),
    enabled: Boolean(id),
  });

  // Enrichment queries — only fire once the booking is loaded so we
  // know the provider/pet IDs to look up. Identity of the OTHER side
  // of the booking is what the detail page is most missing without
  // these; the original screen didn't show it at all.
  const providerId = q.data?.providerId;
  const petId = q.data?.petId;
  const providerQ = useQuery<ServiceProviderDetail>({
    queryKey: ['provider', providerId],
    queryFn: () => api.providers.get(providerId as string),
    enabled: Boolean(providerId),
  });
  const petQ = useQuery<Pet>({
    queryKey: ['pet', petId],
    queryFn: () => api.pets.get(petId as string),
    enabled: Boolean(petId),
  });

  function refresh(): void {
    void qc.invalidateQueries({ queryKey: ['booking', id] });
    void qc.invalidateQueries({ queryKey: ['bookings'] });
  }

  const onErr = (e: Error): void => {
    toast.error(prettifyError(t, e));
  };

  const confirmMut = useMutation({
    mutationFn: () => api.bookings.confirm(id),
    onSuccess: () => {
      refresh();
      toast.success(t('bookings.confirmed'));
    },
    onError: onErr,
  });
  const start = useMutation({
    mutationFn: () => api.bookings.start(id),
    onSuccess: () => {
      refresh();
      toast.success(t('bookings.inProgress'));
    },
    onError: onErr,
  });
  const end = useMutation({
    mutationFn: () => api.bookings.end(id),
    onSuccess: () => {
      refresh();
      toast.success(t('bookings.completed'));
    },
    onError: onErr,
  });
  const cancel = useMutation({
    mutationFn: () => api.bookings.cancel(id),
    onSuccess: () => {
      refresh();
      toast.success(t('toasts.cancelled'));
    },
    onError: onErr,
  });

  if (q.isLoading || me.isLoading) {
    return (
      <ScrollPage>
        <PageLoading />
      </ScrollPage>
    );
  }
  if (q.error) {
    return (
      <ScrollPage>
        <ErrorState error={q.error as Error} onRetry={() => q.refetch()} />
      </ScrollPage>
    );
  }
  if (!q.data) {
    return (
      <ScrollPage>
        <p className="text-sm text-ink-tertiary">{t('errors.notFound')}</p>
      </ScrollPage>
    );
  }

  const b = q.data;
  const meId = me.data?.id;
  const isOwner = meId === b.ownerId;
  const isProvider = meId === b.providerId;
  const busy = confirmMut.isPending || start.isPending || end.isPending || cancel.isPending;
  const isCancelled = b.status === BookingStatus.Cancelled;
  const pillCls = STATUS_PILL_CLASS[b.status];

  async function onCancelClick(): Promise<void> {
    if (!isOwner && !isProvider) return;
    const preview = previewCancellation({
      priceCents: b.priceCents,
      scheduledAt: b.scheduledAt,
      cancelledBy: isProvider ? 'provider' : 'owner',
    });
    const ok = await confirmDialog({
      title: t('confirms.cancelBooking'),
      body: t('confirms.cancelBookingBody', {
        refund: fmtMoney(preview.refundCents),
        appFee: fmtMoney(preview.appFeeCents + preview.providerFeeCents),
      }),
      destructive: true,
      confirmLabel: t('bookings.cancelBooking'),
    });
    if (ok) cancel.mutate();
  }

  async function onEndClick(): Promise<void> {
    const ok = await confirmDialog({
      title: t('confirms.endWalk'),
      body: t('confirms.endWalkBody', { distance: '—' }),
      confirmLabel: t('bookings.end'),
    });
    if (ok) end.mutate();
  }

  // Synthesize timeline events from the booking's timestamps. Real
  // event-sourced timelines come from M-Backend-handshake; for now
  // we derive them from the canonical fields.
  const timeline = synthesizeTimeline(b);

  return (
    <ScrollPage>
      {/* Top bar — back + booking number */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('common.back')}
        </Link>
        <span className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary">
          Booking #{b.id.slice(-6).toUpperCase()}
        </span>
      </div>

      {/* Hero — gradient with status pill + service + counterparty
          name + scheduled time. Hero title gives instant context:
          owner sees "Walking with Sara Khan", provider sees
          "Walking for Bagel". Falls back to plain service name while
          the enrichment queries resolve. */}
      <section className="rounded-3xl bg-gradient-sunset p-6 text-ink-inverse shadow-overlay">
        <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${pillCls}`}>
          <CheckCircle2 className="h-3 w-3" aria-hidden />
          {t(`bookings.${statusKey(b.status)}`)}
        </div>
        <h1 className="text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t(`services.${b.serviceType}`)}
          {isOwner && providerQ.data ? ` with ${providerQ.data.fullName}` : ''}
          {isProvider && petQ.data ? ` for ${petQ.data.name}` : ''}
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-inverse/90">
          <Calendar className="h-4 w-4" aria-hidden />
          {fmtWhen(b.scheduledAt)} · {b.durationMin} min
        </p>
      </section>

      {/* Detail cards */}
      <div className="mt-4 space-y-4 pb-32">
        {/* Provider card — only for owner viewing.
            Shows who's doing the work + Message + View profile. */}
        {isOwner && providerQ.data ? (
          <ProviderCard provider={providerQ.data} />
        ) : null}

        {/* Pet card — visible to both roles. Owner sees their own
            pet (already knows them); provider sees who they're
            taking out (very useful for first-time pairings). */}
        {petQ.data ? <PetCard pet={petQ.data} /> : null}

        {/* Where — uses the snapshotted address from the booking
            row (no fetch needed; address travels with the booking
            so future renames of the source don't rewrite history).
            Accommodation badge flips on for overnight/multi-day
            sitting + boarding. */}
        <WhereCard
          address={b.address}
          addressSource={b.addressSource}
          withAccommodation={b.withAccommodation}
        />

        {/* Price */}
        <DetailCard label={t('bookings.price')}>
          <p className="text-2xl font-bold tracking-tight text-ink-primary">
            {fmtMoney(b.priceCents)}
          </p>
          <p className="mt-1 text-xs text-ink-tertiary">
            Booking created {fmtShort(b.createdAt)}
          </p>
        </DetailCard>

        {/* Notes */}
        {b.notes ? (
          <DetailCard label={t('common.notes')}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-primary">
              {b.notes}
            </p>
          </DetailCard>
        ) : null}

        {/* Payment block — owner sees pay-now / paid status,
            provider sees pay-out status */}
        <PaymentBlock bookingId={b.id} isOwner={isOwner} />

        {/* Timeline */}
        <DetailCard label="Timeline">
          <ol className="space-y-3">
            {timeline.map((evt, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700"
                >
                  {evt.kind === 'clock' ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink-primary">{evt.label}</p>
                  <p className="text-xs text-ink-tertiary">{fmtShort(evt.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        </DetailCard>

        {/* Cancellation breakdown (only when cancelled) */}
        {isCancelled ? (
          <section className="rounded-2xl border border-coral-200 bg-coral-50/50 p-4">
            <h2 className="mb-2 text-sm font-semibold text-coral-800">
              {t('bookings.cancellation')}
            </h2>
            <dl className="space-y-1 text-sm">
              <Row label={t('bookings.cancelledBy')}>
                <span className="font-medium capitalize">{b.cancelledBy ?? '—'}</span>
              </Row>
              {b.cancelledAt ? (
                <Row label={t('bookings.when')}>{fmtWhen(b.cancelledAt)}</Row>
              ) : null}
              {b.cancellationReason ? (
                <Row label="Reason">{b.cancellationReason}</Row>
              ) : null}
              <Row label={t('bookings.refund')}>
                <span className="font-medium">{fmtMoney(b.refundCents)}</span>
              </Row>
              {b.appFeeCents > 0 ? (
                <Row label={t('bookings.appFee')}>
                  <span className="font-medium">{fmtMoney(b.appFeeCents)}</span>
                </Row>
              ) : null}
              {b.providerFeeCents > 0 ? (
                <Row label={t('bookings.providerFee')}>
                  <span className="font-medium">{fmtMoney(b.providerFeeCents)}</span>
                </Row>
              ) : null}
            </dl>
          </section>
        ) : null}

        {/* Owner review form (completed only) */}
        {isOwner && b.status === BookingStatus.Completed ? (
          <LeaveReviewForm bookingId={b.id} providerId={b.providerId} />
        ) : null}
      </div>

      {/* Sticky action footer — role-aware, status-aware */}
      <ActionFooter
        booking={b}
        isOwner={isOwner}
        isProvider={isProvider}
        busy={busy}
        confirmPending={confirmMut.isPending}
        startPending={start.isPending}
        endPending={end.isPending}
        cancelPending={cancel.isPending}
        onConfirm={() => confirmMut.mutate()}
        onStart={() => start.mutate()}
        onEnd={onEndClick}
        onCancel={onCancelClick}
        onViewLive={() => router.push(`/bookings/${b.id}/active`)}
      />
    </ScrollPage>
  );
}

/* ──────────────────────────────────────────────────────────────────
 * Subcomponents (kept inline — single-use to this screen)
 * ────────────────────────────────────────────────────────────────── */

function DetailCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-raised p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/**
 * ProviderCard — owner's view of WHO is doing the walk. Photo, name,
 * rating, verified badge, plus Message + View profile actions. Hidden
 * when the viewer IS the provider (they don't need their own card).
 */
function ProviderCard({ provider }: { provider: ServiceProviderDetail }): JSX.Element {
  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-raised p-4">
      <div className="flex items-center gap-3">
        <span className="relative inline-flex h-14 w-14 shrink-0 overflow-hidden rounded-full bg-warm-100">
          {provider.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={provider.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="m-auto text-sm font-bold text-warm-700">
              {provider.fullName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </span>
        <div className="flex-1">
          <p className="text-base font-bold text-ink-primary">
            {provider.fullName}
            {provider.verified ? (
              <span className="ms-2 inline-flex items-center rounded-full bg-mint-100 px-2 py-0.5 text-[10px] font-semibold text-mint-800">
                Verified
              </span>
            ) : null}
          </p>
          {provider.rating !== null && provider.rating !== undefined ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-secondary">
              <Star className="h-3 w-3 fill-sunshine-400 text-sunshine-500" aria-hidden />
              {provider.rating.toFixed(2)} · {provider.reviewCount} reviews
              {provider.baseCity ? ` · ${provider.baseCity}` : ''}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-ink-tertiary">
              No reviews yet{provider.baseCity ? ` · ${provider.baseCity}` : ''}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/providers/${provider.userId}`}
          className="inline-flex min-h-touch items-center gap-1.5 rounded-lg border border-border-default bg-surface-raised px-4 text-sm font-semibold text-ink-primary hover:bg-warm-50"
        >
          View profile
        </Link>
        <button
          type="button"
          className="inline-flex min-h-touch items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-ink-inverse hover:bg-brand-700"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          Message
        </button>
      </div>
    </section>
  );
}

/**
 * PetCard — name, breed/species, age, optional photo and pet-level
 * notes. Visible to both roles. Owner uses it to verify the right
 * pet was chosen; provider uses it to brief themselves before the
 * walk.
 */
function PetCard({ pet }: { pet: Pet }): JSX.Element {
  const meta = [
    pet.breed,
    pet.species && !pet.breed ? capitalize(pet.species) : null,
    pet.ageYears != null ? `${pet.ageYears} yr` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-raised p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
        Pet
      </p>
      <div className="mt-2 flex items-center gap-3">
        <span className="relative inline-flex h-12 w-12 shrink-0 overflow-hidden rounded-full bg-warm-100">
          {pet.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pet.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <PawPrint className="m-auto h-5 w-5 text-warm-700" aria-hidden />
          )}
        </span>
        <div>
          <p className="text-sm font-bold text-ink-primary">{pet.name}</p>
          {meta ? <p className="mt-0.5 text-xs text-ink-secondary">{meta}</p> : null}
        </div>
      </div>
      {pet.notes ? (
        <p className="mt-3 rounded-lg bg-warm-50 p-3 text-xs leading-relaxed text-ink-secondary">
          <span className="font-semibold uppercase tracking-widest text-ink-tertiary">
            About {pet.name}:
          </span>{' '}
          {pet.notes}
        </p>
      ) : null}
    </section>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  owner_user: "Owner's address",
  owner_pet: "Pet's home",
  provider_user: "Provider's address",
  provider_offering: "Provider's location",
  custom: 'Custom meeting point',
};

/**
 * WhereCard — address snapshot from the booking row. Address is
 * locked at booking time so renames/moves of source records don't
 * rewrite history. Shows the snapshot text + provenance label +
 * accommodation badge.
 */
function WhereCard({
  address,
  addressSource,
  withAccommodation,
}: {
  address: { text: string; lat: number | null; lng: number | null };
  addressSource: string;
  withAccommodation: boolean;
}): JSX.Element {
  const sourceLabel = SOURCE_LABEL[addressSource] ?? addressSource;
  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-raised p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
        Where
      </p>
      <div className="mt-2 flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-tertiary" aria-hidden />
        <div className="flex-1">
          <p className="text-sm font-medium text-ink-primary">
            {address.text || '(no address set)'}
          </p>
          <p className="mt-0.5 text-xs text-ink-tertiary">{sourceLabel}</p>
        </div>
      </div>
      {withAccommodation ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-peach-100 px-3 py-1 text-xs font-semibold text-peach-800">
          <Home className="h-3 w-3" aria-hidden />
          Overnight accommodation
        </p>
      ) : null}
    </section>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Row({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="text-ink-primary">{children}</dd>
    </div>
  );
}

/**
 * ActionFooter — fixed bottom strip with role/status-aware buttons.
 * Falls back to nothing (returns null) for completed/cancelled non-
 * actionable terminal states.
 */
function ActionFooter({
  booking: b,
  isOwner,
  isProvider,
  busy,
  confirmPending,
  startPending,
  endPending,
  cancelPending,
  onConfirm,
  onStart,
  onEnd,
  onCancel,
  onViewLive,
}: {
  booking: Booking;
  isOwner: boolean;
  isProvider: boolean;
  busy: boolean;
  confirmPending: boolean;
  startPending: boolean;
  endPending: boolean;
  cancelPending: boolean;
  onConfirm: () => void;
  onStart: () => void;
  onEnd: () => void;
  onCancel: () => void;
  onViewLive: () => void;
}): JSX.Element | null {
  const { t } = useTranslation();
  const canConfirm = isProvider && b.status === BookingStatus.Pending;
  const canStart = isProvider && b.status === BookingStatus.Confirmed;
  const canEnd = isProvider && b.status === BookingStatus.InProgress;
  const canCancel =
    (isOwner || isProvider) &&
    (b.status === BookingStatus.Pending || b.status === BookingStatus.Confirmed);
  const canViewLive = b.status === BookingStatus.InProgress;

  if (!canConfirm && !canStart && !canEnd && !canCancel && !canViewLive) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-border-subtle bg-surface-base/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-end gap-2 px-4 py-3 sm:px-6">
        {canViewLive ? (
          <button
            type="button"
            onClick={onViewLive}
            className="inline-flex min-h-touch items-center gap-1.5 rounded-lg border border-border-default bg-surface-raised px-4 text-sm font-semibold text-ink-primary hover:bg-warm-50"
          >
            <MapPin className="h-4 w-4" aria-hidden />
            {t('bookings.viewLive')}
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex min-h-touch items-center rounded-lg border border-coral-300 bg-surface-raised px-4 text-sm font-semibold text-coral-700 transition-colors hover:bg-coral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelPending ? <Spinner size="sm" /> : t('bookings.cancelBooking')}
          </button>
        ) : null}
        {canConfirm ? (
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex min-h-touch items-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-ink-inverse transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmPending ? <Spinner size="sm" /> : t('bookings.confirm')}
          </button>
        ) : null}
        {canStart ? (
          <button
            type="button"
            disabled={busy}
            onClick={onStart}
            className="inline-flex min-h-touch items-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-ink-inverse transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {startPending ? <Spinner size="sm" /> : t('bookings.start')}
          </button>
        ) : null}
        {canEnd ? (
          <button
            type="button"
            disabled={busy}
            onClick={onEnd}
            className="inline-flex min-h-touch items-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-ink-inverse transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {endPending ? <Spinner size="sm" /> : t('bookings.end')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Derive a timeline of past events from a booking's canonical
 * timestamps. Future iterations replace this with a real event
 * stream from the backend (`booking_events` table or similar).
 */
function synthesizeTimeline(
  b: Booking,
): { kind: 'check' | 'clock'; label: string; at: string }[] {
  const out: { kind: 'check' | 'clock'; label: string; at: string }[] = [];
  out.push({ kind: 'check', label: 'Booking requested', at: b.createdAt });
  if (
    b.status === BookingStatus.Confirmed ||
    b.status === BookingStatus.InProgress ||
    b.status === BookingStatus.Completed
  ) {
    out.push({ kind: 'check', label: 'Confirmed', at: b.createdAt });
  }
  if (b.status === BookingStatus.InProgress || b.status === BookingStatus.Completed) {
    out.push({ kind: 'clock', label: 'Walk started', at: b.scheduledAt });
  }
  if (b.status === BookingStatus.Completed) {
    out.push({
      kind: 'check',
      label: 'Walk completed',
      at: new Date(
        new Date(b.scheduledAt).getTime() + b.durationMin * 60_000,
      ).toISOString(),
    });
  }
  if (b.status === BookingStatus.Cancelled && b.cancelledAt) {
    out.push({ kind: 'check', label: 'Cancelled', at: b.cancelledAt });
  }
  return out;
}
