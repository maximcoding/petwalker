'use client';

import { Clock, MapPin, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import type { JSX } from 'react';

import { Pill } from '@/components/ui/pill';
import { STATUS_HUE } from '@/lib/booking-lifecycle';
import {
  CATEGORY_LABELS,
  type MockBooking,
  type MockProvider,
} from '@/lib/mock/types';

/**
 * UpcomingBookingCard — actionable card on the Owner home for the
 * next 1–2 confirmed bookings. Shows counterparty + service + time
 * + 3 quick actions (Get directions / Message / Cancel) per the
 * brief.
 */
export interface UpcomingBookingCardProps {
  booking: MockBooking;
  provider: MockProvider;
}

function timeUntil(date: Date): string {
  const ms = date.getTime() - Date.now();
  if (ms < 0) return 'now';
  const hours = Math.floor(ms / 60 / 60_000);
  if (hours < 1) return `in ${Math.max(0, Math.round(ms / 60_000))} min`;
  if (hours < 24) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  return `in ${days}d`;
}

export function UpcomingBookingCard({
  booking,
  provider,
}: UpcomingBookingCardProps): JSX.Element {
  const hue = STATUS_HUE[booking.status] as never;
  const label =
    booking.status === 'pending'
      ? 'Pending'
      : booking.status === 'confirmed'
        ? 'Confirmed'
        : booking.status === 'inProgress'
          ? 'In progress'
          : 'Scheduled';

  return (
    <article className="flex w-[300px] shrink-0 snap-start flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-raised p-4 shadow-subtle sm:w-[340px]">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-ink-tertiary">
            {CATEGORY_LABELS[booking.serviceCategory]}
          </p>
          <h3 className="text-base font-semibold text-ink-primary">
            <Link href={`/bookings/${booking.id}`} className="hover:text-brand-700">
              {provider.name}
            </Link>
          </h3>
        </div>
        <Pill hue={hue} size="sm">
          {label}
        </Pill>
      </header>

      <div className="flex items-center gap-1.5 text-sm font-medium text-ink-primary">
        <Clock className="h-4 w-4 text-ink-tertiary" aria-hidden />
        {booking.scheduledAt.toLocaleString(undefined, {
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
        })}
        <span className="text-ink-tertiary">· {timeUntil(booking.scheduledAt)}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/bookings/${booking.id}#directions`}
          className="inline-flex min-h-touch flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-default bg-surface-raised px-3 text-xs font-semibold text-ink-primary transition-colors hover:bg-warm-50"
        >
          <MapPin className="h-4 w-4" aria-hidden />
          Directions
        </Link>
        <Link
          href={`/messages?thread=${booking.providerId}`}
          className="inline-flex min-h-touch flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-default bg-surface-raised px-3 text-xs font-semibold text-ink-primary transition-colors hover:bg-warm-50"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          Message
        </Link>
      </div>
    </article>
  );
}
