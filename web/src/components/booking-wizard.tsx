'use client';

import {
  Bed,
  Calendar,
  Check,
  Clock,
  Hash,
  Home,
  MapPin,
  MessageSquareText,
  PawPrint,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState, type JSX, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { AddressField } from './address-field';
import { AiSmartPicker } from './ai-smart-picker';
import { DateThenTimePicker } from './date-then-time-picker';
import { WizardShell } from './m3/booking/wizard-shell';

import type { ServiceType } from '@petwalker/shared/enums';
import type {
  Address,
  AddressSource,
  Pet,
  ServiceProviderDetail,
} from '@petwalker/shared/types';

/**
 * BookingWizard — step-based replacement for the legacy BookingForm.
 *
 * Owns all booking-draft state at this level. Step panels read+write
 * the same fields; the final step submits via the same `onSubmit`
 * contract as the old BookingForm so the parent page doesn't need
 * to change its API client call.
 *
 * Visual goals (post-redesign 2026-05-12):
 *  • Provider hero strip at the top of the page — owner sees who
 *    they're committing to before they fill anything in.
 *  • Each step has stronger visual character (M1 palette accents,
 *    soft cards, real photo treatments where pets/providers exist).
 *  • Sticky bottom footer carries a live price preview so the user
 *    knows what they're spending as slots accumulate.
 *
 * Functional contract is unchanged:
 *  • Multi-slot bookings via `scheduledAts: string[]`
 *  • `withAccommodation` for sitting/boarding at owner property
 *  • All 4 `AddressSource` variants supported
 *  • Slots OR date-range modes
 */

const DURATION_PRESETS = [15, 30, 60, 120, 180, 1440, 2880, 4320, 10080] as const;

function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  if (min < 1440) {
    const h = min / 60;
    return Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`;
  }
  const d = min / 1440;
  return Number.isInteger(d) ? `${d} day${d !== 1 ? 's' : ''}` : `${d.toFixed(1)} days`;
}

function fmtMoney(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function fmtRangeDate(key: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return key;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(
    undefined,
    { weekday: 'short', month: 'short', day: 'numeric' },
  );
}

/** Continuous-stay duration = (end - start) days, anchored at the
 *  same check-in hour both ends. Returns minutes. */
function continuousDurationMin(startKey: string, endKey: string): number {
  const sm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startKey);
  const em = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endKey);
  if (!sm || !em) return 0;
  const s = new Date(Number(sm[1]), Number(sm[2]) - 1, Number(sm[3]));
  const e = new Date(Number(em[1]), Number(em[2]) - 1, Number(em[3]));
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 60000));
}

/** Continuous-stay ISO start = start date at check-in hour, local. */
function continuousIsoStart(startKey: string, hour: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startKey);
  if (!m) return new Date().toISOString();
  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    hour,
    0,
    0,
    0,
  ).toISOString();
}

interface Props {
  provider: ServiceProviderDetail;
  serviceType: string;
  pets: Pet[];
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: {
    petId: string;
    scheduledAts: string[];
    durationMin: number;
    notes: string | null;
    addressSource: AddressSource;
    customAddress?: Address;
    withAccommodation: boolean;
  }) => void;
}

function pickInitialSource(
  supports: { owner: boolean; provider: boolean; custom: boolean } | undefined,
): AddressSource {
  if (!supports || supports.owner) return 'owner_pet';
  if (supports.provider) return 'provider_offering';
  return 'custom';
}

export function BookingWizard({
  provider,
  serviceType,
  pets,
  busy,
  error,
  onSubmit,
}: Props): JSX.Element {
  const { t } = useTranslation();
  const offering = useMemo(
    () => provider.offerings.find((o) => o.serviceType === serviceType),
    [provider, serviceType],
  );
  const serviceLabel = t(`services.${serviceType as ServiceType}`);
  const supports = offering?.supportedSources;

  /* ── State (lifted from BookingForm) ──────────────────────────── */
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(pets.length === 1 ? 2 : 1);
  const [petId, setPetId] = useState(pets[0]?.id ?? '');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState('');
  const [addressSource, setAddressSource] = useState<AddressSource>(() =>
    pickInitialSource(supports),
  );
  const [customAddress, setCustomAddress] = useState<Address | null>(null);
  const [withAccommodation, setWithAccommodation] = useState(false);
  // Booking sub-mode (Step 2). 'specific' = pick discrete slots within
  // the chosen range; 'continuous' = one long stay (boarding/sitting);
  // 'smart' = AI plans N walks for you.
  const [bookingMode, setBookingMode] = useState<'specific' | 'continuous' | 'smart'>(
    'smart',
  );
  // Always-on date range (YYYY-MM-DD). Default to today → today + 7d
  // so the picker shows something useful immediately.
  const today = new Date();
  const initialEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [rangeStart, setRangeStart] = useState<string>(toLocalDateStr(today));
  const [rangeEnd, setRangeEnd] = useState<string>(toLocalDateStr(initialEnd));
  // Continuous-stay-only check-in hour.
  const [checkInHour, setCheckInHour] = useState<number>(8);
  const [termsAccepted, setTermsAccepted] = useState(false);

  /* ── Derived ──────────────────────────────────────────────────── */
  const isAtOwnerProperty = addressSource === 'owner_pet' || addressSource === 'owner_user';
  const continuousMin =
    bookingMode === 'continuous' ? continuousDurationMin(rangeStart, rangeEnd) : 0;
  const effectiveDuration =
    bookingMode === 'continuous' ? continuousMin : duration;
  const previewCents = offering
    ? Math.round(offering.hourlyRateCents * (effectiveDuration / 60))
    : 0;
  const slotCount =
    bookingMode === 'continuous' ? 1 : Math.max(1, selectedSlots.size);
  const totalCents = previewCents * slotCount;
  const selectedPet = pets.find((p) => p.id === petId);
  const providerAddrText =
    offering?.serviceAddress?.text ?? t('booking.providerLocation');
  const petAddrText =
    selectedPet?.address?.text ??
    '(Set a home address on this pet or your account)';
  const locationEnabledCount = supports
    ? (supports.owner ? 1 : 0) +
      (supports.provider ? 1 : 0) +
      (supports.custom ? 1 : 0)
    : 0;

  /* ── Early returns ────────────────────────────────────────────── */
  if (!offering) {
    return (
      <p className="m-6 rounded-2xl border border-coral-200 bg-coral-50 p-4 text-sm text-coral-700">
        This provider doesn&apos;t offer {serviceLabel} (anymore).
      </p>
    );
  }
  if (pets.length === 0) {
    return (
      <div className="m-6 rounded-3xl border border-dashed border-border-default bg-surface-raised p-8 text-center">
        <PawPrint className="mx-auto h-10 w-10 text-warm-400" aria-hidden />
        <p className="mt-3 text-base font-semibold text-ink-primary">
          Add a pet before booking
        </p>
        <p className="mt-1 text-sm text-ink-secondary">
          {provider.fullName} needs to know who they&apos;ll be walking.
        </p>
        <a
          href="/pets/new"
          className="mt-4 inline-flex min-h-touch items-center gap-2 rounded-lg bg-brand-600 px-6 text-sm font-semibold text-ink-inverse hover:bg-brand-700"
        >
          Add a pet
        </a>
      </div>
    );
  }

  /* ── Step validation ──────────────────────────────────────────── */
  function canAdvance(): boolean {
    switch (step) {
      case 1:
        return Boolean(petId);
      case 2:
        if (!rangeStart || !rangeEnd || rangeEnd < rangeStart) return false;
        if (bookingMode === 'continuous') return continuousMin > 0;
        return selectedSlots.size > 0;
      case 3:
        if (addressSource === 'custom') {
          return Boolean(customAddress && customAddress.text.trim());
        }
        return true;
      case 4:
        return true;
      case 5:
        return termsAccepted && !busy;
    }
  }

  /* ── Submit (only on step 5) ──────────────────────────────────── */
  function submit(): void {
    if (!canAdvance()) return;
    const base = {
      petId,
      notes: notes || null,
      addressSource,
      customAddress: addressSource === 'custom' ? customAddress ?? undefined : undefined,
      withAccommodation: isAtOwnerProperty && withAccommodation,
    };
    if (bookingMode === 'continuous') {
      if (continuousMin <= 0) return;
      onSubmit({
        ...base,
        scheduledAts: [continuousIsoStart(rangeStart, checkInHour)],
        durationMin: continuousMin,
      });
      return;
    }
    if (selectedSlots.size === 0) return;
    onSubmit({
      ...base,
      scheduledAts: [...selectedSlots].sort(),
      durationMin: duration,
    });
  }

  function handleNext(): void {
    if (step === 5) {
      submit();
      return;
    }
    setStep((s) => (s + 1) as typeof step);
  }

  function handleBack(): void {
    if (step === 1) return;
    // Skip back over auto-advanced pet step if owner has one pet.
    if (step === 2 && pets.length === 1) return;
    setStep((s) => (s - 1) as typeof step);
  }

  /* ── Live price slot shown in sticky footer ───────────────────── */
  const hasPrice =
    totalCents > 0 && (selectedSlots.size > 0 || bookingMode === 'continuous');
  const priceSlot = hasPrice ? (
    <div className="flex flex-col items-end">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
        {slotCount > 1 ? `${slotCount} slots` : 'Total'}
      </span>
      <span className="text-lg font-extrabold text-ink-primary">{fmtMoney(totalCents)}</span>
    </div>
  ) : null;

  /* ── Per-step heading meta (lifted into shell chrome) ─────────── */
  const stepMeta = (() => {
    switch (step) {
      case 1:
        return {
          eyebrow: 'Step 1 · Pet',
          title: "Who's joining?",
          subtitle: 'Pick the pet for this booking.',
        };
      case 2:
        return {
          eyebrow: 'Step 2 · When',
          title: 'Pick a time',
          subtitle: `Choose your dates for ${serviceLabel.toLowerCase()}.`,
        };
      case 3:
        return {
          eyebrow: 'Step 3 · Where',
          title: 'Where does the walk start?',
          subtitle: `Booking ${serviceLabel.toLowerCase()} with ${provider.fullName}.`,
        };
      case 4:
        return {
          eyebrow: 'Step 4 · Notes',
          title: 'Anything the walker should know?',
          subtitle: 'Optional. Helpful for first-time walks.',
        };
      case 5:
        return {
          eyebrow: 'Step 5 · Review',
          title: 'Almost done.',
          subtitle: `You won't be charged until ${provider.fullName} confirms.`,
        };
    }
  })();

  return (
    <WizardShell
      exitHref={`/providers/${provider.userId}`}
      exitLabel={`Back to ${provider.fullName}`}
      totalSteps={5}
      currentStep={step}
      stepEyebrow={stepMeta.eyebrow}
      stepTitle={stepMeta.title}
      stepSubtitle={stepMeta.subtitle}
      onBack={step > 1 && !(step === 2 && pets.length === 1) ? handleBack : null}
      onNext={handleNext}
      nextLabel={step === 5 ? 'Book this walk' : 'Continue'}
      canAdvance={canAdvance()}
      busy={Boolean(busy)}
      priceSlot={priceSlot}
    >
      {step === 1 && <Step1Pet pets={pets} selectedId={petId} onPick={setPetId} />}

      {step === 2 && (
        <Step2When
          provider={provider}
          serviceType={serviceType}
          serviceLabel={serviceLabel}
          bookingMode={bookingMode}
          onBookingModeChange={(m) => {
            setBookingMode(m);
            // Switching modes clears in-flight slot picks but preserves
            // the range — the date range is the universal scope and
            // outlives sub-mode flips.
            setSelectedSlots(new Set());
          }}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onRangeChange={(start, end) => {
            setRangeStart(start);
            setRangeEnd(end);
            setSelectedSlots(new Set());
          }}
          checkInHour={checkInHour}
          onCheckInHourChange={setCheckInHour}
          duration={duration}
          onDurationChange={(d) => {
            setDuration(d);
            setSelectedSlots(new Set());
          }}
          selectedSlots={selectedSlots}
          onSlotToggle={(start) =>
            setSelectedSlots((prev) => {
              const next = new Set(prev);
              if (next.has(start)) next.delete(start);
              else next.add(start);
              return next;
            })
          }
          onSlotsClear={() => setSelectedSlots(new Set())}
        />
      )}

      {step === 3 && (
        <Step3Where
          supports={supports}
          addressSource={addressSource}
          onAddressSourceChange={setAddressSource}
          customAddress={customAddress}
          onCustomAddressChange={setCustomAddress}
          petAddrText={petAddrText}
          providerAddrText={providerAddrText}
          locationEnabledCount={locationEnabledCount}
          isAtOwnerProperty={isAtOwnerProperty}
          withAccommodation={withAccommodation}
          onAccommodationChange={setWithAccommodation}
        />
      )}

      {step === 4 && <Step4Notes notes={notes} onChange={setNotes} />}

      {step === 5 && (
        <Step5Review
          provider={provider}
          serviceLabel={serviceLabel}
          pet={selectedPet}
          bookingMode={bookingMode}
          selectedSlots={[...selectedSlots].sort()}
          continuousIsoStart={
            bookingMode === 'continuous' ? continuousIsoStart(rangeStart, checkInHour) : null
          }
          continuousDurationMin={bookingMode === 'continuous' ? continuousMin : 0}
          duration={effectiveDuration}
          totalCents={totalCents}
          slotCount={slotCount}
          notes={notes}
          addressSource={addressSource}
          customAddress={customAddress}
          petAddrText={petAddrText}
          providerAddrText={providerAddrText}
          withAccommodation={isAtOwnerProperty && withAccommodation}
          termsAccepted={termsAccepted}
          onTermsToggle={setTermsAccepted}
          error={error ?? null}
        />
      )}
    </WizardShell>
  );
}

/* ── Step 1: Pet ──────────────────────────────────────────────── */
function Step1Pet({
  pets,
  selectedId,
  onPick,
}: {
  pets: Pet[];
  selectedId: string;
  onPick: (id: string) => void;
}): JSX.Element {
  return (
    <>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {pets.map((pet) => {
          const isSel = selectedId === pet.id;
          return (
            <li key={pet.id}>
              <button
                type="button"
                aria-pressed={isSel}
                onClick={() => onPick(pet.id)}
                className={[
                  'group flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-start transition-all',
                  isSel
                    ? 'border-brand-600 bg-brand-50 shadow-card'
                    : 'border-border-subtle bg-surface-raised shadow-subtle hover:border-border-strong hover:shadow-card',
                ].join(' ')}
              >
                <span className="relative inline-flex h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gradient-meadow">
                  {pet.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pet.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <PawPrint className="m-auto h-6 w-6 text-ink-inverse" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-ink-primary">{pet.name}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-secondary">
                    {[pet.breed, pet.species, pet.ageYears ? `${pet.ageYears} yr` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                {isSel && (
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-ink-inverse">
                    <Check className="h-4 w-4" aria-hidden />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 text-center text-xs text-ink-tertiary">
        Need to add a pet?{' '}
        <a href="/pets/new" className="font-medium text-ink-link hover:underline">
          Add a pet →
        </a>
      </p>
    </>
  );
}

/* ── Step 2: When ──────────────────────────────────────────────── */

type Step2Mode = 'specific' | 'continuous' | 'smart';

const CHECK_IN_HOURS = [
  { label: 'Morning', hour: 8 },
  { label: 'Noon', hour: 12 },
  { label: 'Afternoon', hour: 15 },
  { label: 'Evening', hour: 18 },
] as const;

function Step2When(props: {
  provider: ServiceProviderDetail;
  serviceType: string;
  serviceLabel: string;
  bookingMode: Step2Mode;
  onBookingModeChange: (m: Step2Mode) => void;
  rangeStart: string;
  rangeEnd: string;
  onRangeChange: (start: string, end: string) => void;
  checkInHour: number;
  onCheckInHourChange: (h: number) => void;
  duration: number;
  onDurationChange: (d: number) => void;
  selectedSlots: Set<string>;
  onSlotToggle: (start: string) => void;
  onSlotsClear: () => void;
}): JSX.Element {
  const {
    provider,
    serviceType,
    serviceLabel,
    bookingMode,
    onBookingModeChange,
    rangeStart,
    rangeEnd,
    onRangeChange,
    checkInHour,
    onCheckInHourChange,
    duration,
    onDurationChange,
    selectedSlots,
    onSlotToggle,
    onSlotsClear,
  } = props;

  const todayKey = toLocalDateStr(new Date());
  const validRange =
    Boolean(rangeStart) && Boolean(rangeEnd) && rangeEnd >= rangeStart;
  const dayCount = validRange ? continuousDurationMin(rangeStart, rangeEnd) / 1440 : 0;

  // Step 2 owns its own height — date range + sub-mode toggle stay
  // pinned at the top while the mode-body below scrolls in its own
  // bounded area. This keeps the outer page from jumping when the
  // active mode swaps to a taller or shorter body.
  return (
    <div className="flex h-full flex-col">
      {/* ── PINNED HEADER (date range + sub-mode toggle) ─────── */}
      <div className="shrink-0">
      {/* ── ALWAYS-ON DATE RANGE ────────────────────────────────── */}
      <PanelCard
        label="Date range"
        icon={<Calendar className="h-4 w-4" aria-hidden />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-widest text-ink-tertiary">
              Check-in
            </span>
            <input
              type="date"
              min={todayKey}
              value={rangeStart}
              onChange={(e) => {
                const next = e.target.value;
                const nextEnd = rangeEnd && rangeEnd >= next ? rangeEnd : next;
                onRangeChange(next, nextEnd);
              }}
              className="mt-1 block w-full rounded-lg border border-border-subtle bg-surface-base px-3 py-2 text-sm text-ink-primary focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-widest text-ink-tertiary">
              Check-out
            </span>
            <input
              type="date"
              min={rangeStart || todayKey}
              value={rangeEnd}
              onChange={(e) => onRangeChange(rangeStart, e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border-subtle bg-surface-base px-3 py-2 text-sm text-ink-primary focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
        </div>
        {validRange ? (
          <p className="mt-2 text-xs text-ink-secondary">
            <span className="font-semibold text-ink-primary">
              {dayCount === 0 ? 'Same day' : `${dayCount} day${dayCount !== 1 ? 's' : ''}`}
            </span>
            <span className="mx-1.5 text-ink-tertiary">·</span>
            {fmtRangeDate(rangeStart)} → {fmtRangeDate(rangeEnd)}
          </p>
        ) : (
          <p className="mt-2 text-xs text-coral-700">Pick a valid range.</p>
        )}
      </PanelCard>

      {/* ── SUB-MODE TOGGLE ─────────────────────────────────────── */}
      <p className="mb-1.5 mt-3 text-[11px] font-bold uppercase tracking-widest text-ink-tertiary">
        What to book in this range
      </p>
      {/* Three fixed-width cards in a grid — equal columns mean the
          toggle never shifts when the body below changes height.
          AI Smart choice is the primary default and sits leftmost. */}
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(
          [
            {
              id: 'smart',
              label: 'AI Smart choice',
              sub: 'AI plans for you',
              icon: <Sparkles className="h-5 w-5" aria-hidden />,
              tone: 'lavender' as const,
            },
            {
              id: 'specific',
              label: 'Specific times',
              sub: 'Pick day by day',
              icon: <Clock className="h-5 w-5" aria-hidden />,
              tone: 'brand' as const,
            },
            {
              id: 'continuous',
              label: 'Continuous stay',
              sub: 'One long booking',
              icon: <Bed className="h-5 w-5" aria-hidden />,
              tone: 'mint' as const,
            },
          ] as const
        ).map((m) => (
          <ModeCard
            key={m.id}
            label={m.label}
            sub={m.sub}
            icon={m.icon}
            tone={m.tone}
            active={bookingMode === m.id}
            onClick={() => onBookingModeChange(m.id)}
          />
        ))}
      </div>
      </div>{/* /shrink-0 pinned header */}

      {/* ── SCROLLABLE MODE BODY ────────────────────────────────
          The body owns the remaining viewport height. All three
          mode bodies stay MOUNTED at all times (`hidden` collapses
          inactive ones), so switching never remounts a picker and
          never causes a spinner flash or page-level shift.

          `scrollbarGutter: stable` reserves the scrollbar's width
          permanently — so a scrollbar appearing as content grows
          never reflows the layout horizontally (the "jump"). */}
      <div
        className="-mx-1 flex-1 min-h-0 overflow-y-auto px-1 pb-2"
        style={{ scrollbarGutter: 'stable' }}
      >
      {!validRange ? (
        <p className="rounded-xl border border-dashed border-border-subtle bg-warm-50 p-4 text-center text-sm text-ink-tertiary">
          Pick a valid date range above to continue.
        </p>
      ) : (
        <>
          {/* AI Smart choice — primary default */}
          <div
            className={bookingMode === 'smart' ? '' : 'hidden'}
            aria-hidden={bookingMode !== 'smart'}
          >
            <AiSmartPicker
              providerId={provider.userId}
              serviceType={serviceType as ServiceType}
              durationMin={duration}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              value={selectedSlots}
              onChange={onSlotToggle}
              onClear={onSlotsClear}
            />
          </div>

          {/* Specific times per day */}
          <div
            className={bookingMode === 'specific' ? '' : 'hidden'}
            aria-hidden={bookingMode !== 'specific'}
          >
            <PanelCard
              label="Duration per slot"
              icon={<Hash className="h-4 w-4" aria-hidden />}
            >
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={duration === d}
                    onClick={() => onDurationChange(d)}
                    className={[
                      'rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition-colors',
                      duration === d
                        ? 'border-brand-600 bg-brand-600 text-ink-inverse'
                        : 'border-border-subtle bg-surface-raised text-ink-secondary hover:border-border-strong hover:text-ink-primary',
                    ].join(' ')}
                  >
                    {fmtDuration(d)}
                  </button>
                ))}
              </div>
            </PanelCard>

            <div className="mt-4">
              <DateThenTimePicker
                providerId={provider.userId}
                serviceType={serviceType as ServiceType}
                durationMin={duration}
                value={selectedSlots}
                onChange={onSlotToggle}
                onClear={onSlotsClear}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
              />
            </div>
          </div>

          {/* Continuous stay */}
          <div
            className={bookingMode === 'continuous' ? '' : 'hidden'}
            aria-hidden={bookingMode !== 'continuous'}
          >
            <PanelCard
              label="Check-in time"
              icon={<Clock className="h-4 w-4" aria-hidden />}
            >
              <div className="flex flex-wrap gap-2">
                {CHECK_IN_HOURS.map(({ label, hour }) => (
                  <button
                    key={hour}
                    type="button"
                    aria-pressed={checkInHour === hour}
                    onClick={() => onCheckInHourChange(hour)}
                    className={[
                      'rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition-colors',
                      checkInHour === hour
                        ? 'border-brand-600 bg-brand-600 text-ink-inverse'
                        : 'border-border-subtle bg-surface-raised text-ink-secondary hover:border-border-strong hover:text-ink-primary',
                    ].join(' ')}
                  >
                    {label} · {hour}:00
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-secondary">
                One continuous booking from {fmtRangeDate(rangeStart)} at {checkInHour}:00 →{' '}
                {fmtRangeDate(rangeEnd)} at {checkInHour}:00 ({dayCount} day{dayCount !== 1 ? 's' : ''}).
              </p>
            </PanelCard>
          </div>
        </>
      )}

      </div>{/* /flex-1 scrollable body */}
    </div>
  );
}

/* ── ModeCard — equal-width sub-mode toggle card. ──────────────── */
function ModeCard({
  label,
  sub,
  icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  icon: ReactNode;
  tone: 'brand' | 'mint' | 'lavender';
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  const toneCls: Record<typeof tone, { sel: string; iconText: string; iconBg: string }> = {
    brand: {
      sel: 'border-brand-600 bg-brand-50',
      iconText: 'text-brand-700',
      iconBg: 'bg-brand-100',
    },
    mint: {
      sel: 'border-mint-600 bg-mint-50',
      iconText: 'text-mint-700',
      iconBg: 'bg-mint-100',
    },
    lavender: {
      sel: 'border-lavender-600 bg-lavender-50',
      iconText: 'text-lavender-700',
      iconBg: 'bg-lavender-100',
    },
  };
  const cls = toneCls[tone];
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        'flex w-full items-center gap-2 rounded-xl border-2 p-2 text-start transition-colors',
        active
          ? cls.sel
          : 'border-border-subtle bg-surface-raised hover:border-border-strong',
      ].join(' ')}
    >
      <span
        aria-hidden
        className={[
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          cls.iconBg,
          cls.iconText,
        ].join(' ')}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold leading-tight text-ink-primary">{label}</span>
        <span className="block truncate text-[10px] text-ink-secondary">{sub}</span>
      </span>
      <span
        className={[
          'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
          active
            ? 'border-brand-600 bg-brand-600 text-ink-inverse'
            : 'border-border-strong bg-surface-base',
        ].join(' ')}
        aria-hidden
      >
        {active ? <Check className="h-3 w-3" aria-hidden /> : null}
      </span>
    </button>
  );
}

/* ── Step 3: Where ─────────────────────────────────────────────── */
function Step3Where(props: {
  supports: { owner: boolean; provider: boolean; custom: boolean } | undefined;
  addressSource: AddressSource;
  onAddressSourceChange: (s: AddressSource) => void;
  customAddress: Address | null;
  onCustomAddressChange: (a: Address | null) => void;
  petAddrText: string;
  providerAddrText: string;
  locationEnabledCount: number;
  isAtOwnerProperty: boolean;
  withAccommodation: boolean;
  onAccommodationChange: (v: boolean) => void;
}): JSX.Element {
  const {
    supports,
    addressSource,
    onAddressSourceChange,
    customAddress,
    onCustomAddressChange,
    petAddrText,
    providerAddrText,
    locationEnabledCount,
    isAtOwnerProperty,
    withAccommodation,
    onAccommodationChange,
  } = props;
  const { t } = useTranslation();

  return (
    <>
      {locationEnabledCount > 1 ? (
        <div className="space-y-3">
          {supports?.owner ? (
            <WhereRadio
              checked={addressSource === 'owner_pet'}
              icon={<Home className="h-5 w-5" aria-hidden />}
              tone="mint"
              label={t('booking.atPetHome', { defaultValue: "At pet's home" })}
              hint={petAddrText}
              onSelect={() => onAddressSourceChange('owner_pet')}
            />
          ) : null}
          {supports?.provider ? (
            <WhereRadio
              checked={addressSource === 'provider_offering'}
              icon={<PawPrint className="h-5 w-5" aria-hidden />}
              tone="coral"
              label={t('booking.atProviderLocation', { defaultValue: "At provider's place" })}
              hint={providerAddrText}
              onSelect={() => onAddressSourceChange('provider_offering')}
            />
          ) : null}
          {supports?.custom ? (
            <WhereRadio
              checked={addressSource === 'custom'}
              icon={<MapPin className="h-5 w-5" aria-hidden />}
              tone="sky"
              label={t('booking.atOtherAddress', { defaultValue: 'At another address' })}
              hint="Type an address or landmark."
              onSelect={() => onAddressSourceChange('custom')}
            />
          ) : null}
          {addressSource === 'custom' ? (
            <div className="mt-3 rounded-2xl border border-border-subtle bg-surface-raised p-4">
              <AddressField
                value={customAddress}
                onChange={onCustomAddressChange}
                label=""
                hint={t('booking.customAddressHint', { defaultValue: 'Pick a meeting point.' })}
              />
            </div>
          ) : null}
        </div>
      ) : supports?.custom ? (
        <PanelCard label="Meeting point" icon={<MapPin className="h-4 w-4" aria-hidden />}>
          <AddressField
            value={customAddress}
            onChange={onCustomAddressChange}
            label=""
            hint={t('booking.customAddressHint', { defaultValue: 'Pick a meeting point.' })}
          />
        </PanelCard>
      ) : (
        <PanelCard label="Location" icon={<MapPin className="h-4 w-4" aria-hidden />}>
          <p className="text-sm text-ink-secondary">
            {addressSource === 'owner_pet'
              ? `Walks start at ${petAddrText}.`
              : addressSource === 'provider_offering'
                ? `Walks start at ${providerAddrText}.`
                : 'Walks start at a custom address.'}
          </p>
        </PanelCard>
      )}

      {isAtOwnerProperty ? (
        <label
          className={[
            'mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors',
            withAccommodation
              ? 'border-peach-400 bg-peach-50'
              : 'border-border-subtle bg-surface-raised hover:border-border-strong',
          ].join(' ')}
        >
          <input
            type="checkbox"
            checked={withAccommodation}
            onChange={(e) => onAccommodationChange(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-peach-600"
          />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-ink-primary">
              Overnight accommodation
            </span>
            <span className="mt-0.5 block text-xs text-ink-secondary">
              Walker stays at your home overnight (for boarding / sitting).
            </span>
          </span>
        </label>
      ) : null}
    </>
  );
}

function WhereRadio({
  checked,
  icon,
  tone,
  label,
  hint,
  onSelect,
}: {
  checked: boolean;
  icon: ReactNode;
  tone: 'mint' | 'coral' | 'sky';
  label: string;
  hint: string;
  onSelect: () => void;
}): JSX.Element {
  const toneCls =
    tone === 'mint'
      ? 'bg-mint-100 text-mint-700'
      : tone === 'coral'
        ? 'bg-coral-100 text-coral-700'
        : 'bg-sky-100 text-sky-700';
  return (
    <label
      className={[
        'flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-all',
        checked
          ? 'border-brand-600 bg-brand-50 shadow-card'
          : 'border-border-subtle bg-surface-raised shadow-subtle hover:border-border-strong hover:shadow-card',
      ].join(' ')}
    >
      <span
        aria-hidden
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneCls}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink-primary">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-ink-secondary">{hint}</span>
      </span>
      <input
        type="radio"
        name="addr-source"
        checked={checked}
        onChange={onSelect}
        className="mt-1 h-5 w-5 accent-brand-600"
      />
    </label>
  );
}

/* ── Step 4: Care notes ────────────────────────────────────────── */
function Step4Notes({
  notes,
  onChange,
}: {
  notes: string;
  onChange: (v: string) => void;
}): JSX.Element {
  const max = 500;
  return (
    <>
      <PanelCard
        label="Care notes"
        icon={<MessageSquareText className="h-4 w-4" aria-hidden />}
      >
        <textarea
          rows={6}
          maxLength={max}
          placeholder="Feeding times, medications, leash quirks, gate codes, allergies…"
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full resize-y rounded-lg border border-border-subtle bg-surface-base px-3 py-2.5 text-sm leading-relaxed text-ink-primary shadow-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <p className="mt-1.5 text-end text-xs text-ink-tertiary">
          {notes.length}/{max}
        </p>
      </PanelCard>
    </>
  );
}

/* ── Step 5: Review & book ─────────────────────────────────────── */
function Step5Review(props: {
  provider: ServiceProviderDetail;
  serviceLabel: string;
  pet: Pet | undefined;
  bookingMode: Step2Mode;
  selectedSlots: string[];
  continuousIsoStart: string | null;
  continuousDurationMin: number;
  duration: number;
  totalCents: number;
  slotCount: number;
  notes: string;
  addressSource: AddressSource;
  customAddress: Address | null;
  petAddrText: string;
  providerAddrText: string;
  withAccommodation: boolean;
  termsAccepted: boolean;
  onTermsToggle: (v: boolean) => void;
  error: string | null;
}): JSX.Element {
  const {
    provider,
    serviceLabel,
    pet,
    bookingMode,
    selectedSlots,
    continuousIsoStart,
    continuousDurationMin,
    duration,
    totalCents,
    slotCount,
    notes,
    addressSource,
    customAddress,
    petAddrText,
    providerAddrText,
    withAccommodation,
    termsAccepted,
    onTermsToggle,
    error,
  } = props;

  const whenSummary =
    bookingMode === 'continuous' && continuousIsoStart
      ? `${fmtDateTime(continuousIsoStart)} · ${fmtDuration(continuousDurationMin)}`
      : selectedSlots.length === 0
        ? '—'
        : selectedSlots.length === 1 && selectedSlots[0]
          ? `${fmtDateTime(selectedSlots[0])} · ${fmtDuration(duration)}`
          : `${selectedSlots.length} slots · ${fmtDuration(duration)} each`;

  const whereSummary =
    addressSource === 'owner_pet'
      ? `At pet's home · ${petAddrText}`
      : addressSource === 'owner_user'
        ? `At your home · ${petAddrText}`
        : addressSource === 'provider_offering' || addressSource === 'provider_user'
          ? `At ${provider.fullName}'s place · ${providerAddrText}`
          : `Custom · ${customAddress?.text ?? '—'}`;

  return (
    <>
      <div className="space-y-3">
        <SummaryRow icon={<Sparkles className="h-4 w-4" />} label="Service">
          {serviceLabel}
        </SummaryRow>
        <SummaryRow icon={<PawPrint className="h-4 w-4" />} label="Pet">
          {pet ? `${pet.name} · ${pet.breed ?? pet.species}` : '—'}
        </SummaryRow>
        <SummaryRow icon={<Calendar className="h-4 w-4" />} label="When">
          {whenSummary}
        </SummaryRow>
        <SummaryRow icon={<MapPin className="h-4 w-4" />} label="Where">
          {whereSummary}
        </SummaryRow>
        {withAccommodation ? (
          <SummaryRow icon={<Home className="h-4 w-4" />} label="Accommodation">
            Overnight stay
          </SummaryRow>
        ) : null}
        {notes ? (
          <SummaryRow icon={<MessageSquareText className="h-4 w-4" />} label="Care notes" multiline>
            {notes}
          </SummaryRow>
        ) : null}
      </div>

      {/* Price */}
      <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-meadow p-5 text-ink-inverse shadow-overlay">
        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-inverse/85">
          Price
        </p>
        <dl className="mt-3 space-y-1.5 text-sm">
          {slotCount > 1 ? (
            <div className="flex items-center justify-between">
              <dt className="text-ink-inverse/85">
                Rate × {slotCount} slot{slotCount !== 1 ? 's' : ''}
              </dt>
              <dd>{fmtMoney(totalCents / slotCount)} ea</dd>
            </div>
          ) : null}
          <div className="mt-1.5 flex items-end justify-between border-t border-ink-inverse/20 pt-2">
            <dt className="text-base font-bold">Total</dt>
            <dd className="text-2xl font-extrabold tracking-tight">{fmtMoney(totalCents)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-ink-inverse/85">
          You won't be charged until {provider.fullName} confirms.
        </p>
      </section>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl bg-warm-50 p-4">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => onTermsToggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brand-600"
        />
        <span className="text-xs leading-relaxed text-ink-secondary">
          I agree to PetWalker's{' '}
          <a href="/terms" className="font-medium text-ink-link underline-offset-2 hover:underline">
            Terms
          </a>{' '}
          and the{' '}
          <a
            href="/terms#cancellation"
            className="font-medium text-ink-link underline-offset-2 hover:underline"
          >
            cancellation policy
          </a>
          .
        </span>
      </label>

      {error ? (
        <p
          role="alert"
          className="mt-3 whitespace-pre-wrap rounded-lg border border-coral-200 bg-coral-50 px-3 py-2 text-sm font-medium text-coral-700"
        >
          {error}
        </p>
      ) : null}
    </>
  );
}

/* ── Shared primitives ─────────────────────────────────────────── */
function PanelCard({
  label,
  icon,
  className = '',
  children,
}: {
  label: string;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section
      className={`rounded-2xl border border-border-subtle bg-surface-raised p-4 shadow-subtle ${className}`}
    >
      <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-ink-tertiary">
        {icon}
        {label}
      </p>
      {children}
    </section>
  );
}

function SummaryRow({
  icon,
  label,
  children,
  multiline = false,
}: {
  icon?: ReactNode;
  label: string;
  children: ReactNode;
  multiline?: boolean;
}): JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border-subtle bg-surface-raised p-4 shadow-subtle">
      {icon ? (
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700"
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
          {label}
        </p>
        <p
          className={[
            'mt-0.5 text-sm font-medium text-ink-primary',
            multiline ? 'whitespace-pre-wrap' : '',
          ].join(' ')}
        >
          {children}
        </p>
      </div>
    </div>
  );
}
