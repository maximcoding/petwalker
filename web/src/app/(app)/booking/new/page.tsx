'use client';

import { Check, MapPin, PawPrint } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useReducer, type JSX } from 'react';

import { StepHeading, WizardShell } from '@/components/m3/booking/wizard-shell';
import {
  CATEGORY_HUE,
  CATEGORY_LABELS,
  PETS,
  PROVIDER_BY_ID,
  type MockPet,
  type MockProvider,
  type MockProviderService,
  type ServiceCategory,
} from '@/lib/mock';

/**
 * Static class map for service-category icon orbs. Tailwind JIT can't
 * resolve interpolated class names (`bg-${hue}-100`) — the class must
 * appear literally in source for the safelist to pick it up. Listing
 * every (hue × stop) pair we use keeps it tidy.
 */
const HUE_ICON_CLASS: Record<string, string> = {
  brand: 'bg-brand-100 text-brand-700',
  coral: 'bg-coral-100 text-coral-700',
  lavender: 'bg-lavender-100 text-lavender-700',
  mint: 'bg-mint-100 text-mint-700',
  sunshine: 'bg-sunshine-100 text-sunshine-700',
  peach: 'bg-peach-100 text-peach-700',
  sky: 'bg-sky-100 text-sky-700',
};

/**
 * /booking/new — 5-step booking wizard.
 *
 *   1. Service       — which category of work
 *   2. Pet           — which of the owner's pets
 *   3. When & where  — datetime + pickup mode
 *   4. Care notes    — free text + (future: photo)
 *   5. Review        — summary + price + ToS + Book
 *
 * Provider is pre-selected via ?providerId=… (entered from the
 * provider profile or a search result). If missing/invalid, the
 * page redirects to /search.
 *
 * Payment is stubbed in this PR — clicking "Book this walk" mocks
 * a successful charge and routes to /booking/{newId}. Real payment
 * lands in M-Backend-handshake.
 *
 * Full spec: docs/booking-flow-spec.md
 */

type PickupMode = 'owner-home' | 'provider-home' | 'meeting-point';

interface BookingDraft {
  providerId: string;
  serviceCategory: ServiceCategory | null;
  petId: string | null;
  startsAt: string;
  pickupMode: PickupMode;
  pickupAddress: string;
  careNotes: string;
  termsAccepted: boolean;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface WizardState {
  step: Step;
  draft: BookingDraft;
  busy: boolean;
  error: string | null;
}

type WizardAction =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'set'; patch: Partial<BookingDraft> }
  | { type: 'submit-start' }
  | { type: 'submit-success' }
  | { type: 'submit-error'; message: string };

function nextStep(s: Step): Step {
  return Math.min(5, s + 1) as Step;
}
function prevStep(s: Step): Step {
  return Math.max(1, s - 1) as Step;
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'next':
      return { ...state, step: nextStep(state.step), error: null };
    case 'back':
      return { ...state, step: prevStep(state.step), error: null };
    case 'set':
      return { ...state, draft: { ...state.draft, ...action.patch } };
    case 'submit-start':
      return { ...state, busy: true, error: null };
    case 'submit-success':
      return { ...state, busy: false };
    case 'submit-error':
      return { ...state, busy: false, error: action.message };
  }
}

function canAdvance(state: WizardState): boolean {
  const d = state.draft;
  switch (state.step) {
    case 1:
      return d.serviceCategory !== null;
    case 2:
      return d.petId !== null;
    case 3:
      return d.startsAt.length > 0 && (d.pickupMode !== 'meeting-point' || d.pickupAddress.length > 0);
    case 4:
      return true; // care notes optional
    case 5:
      return d.termsAccepted && !state.busy;
  }
}

export default function BookingWizardPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerId = searchParams.get('providerId') ?? '';
  const provider = PROVIDER_BY_ID[providerId];

  // Earliest legal start = now + 1 hour, formatted for datetime-local input.
  const minStart = useMemo(() => {
    const d = new Date(Date.now() + 60 * 60_000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  }, []);

  const [state, dispatch] = useReducer(reducer, {
    step: 1,
    draft: {
      providerId,
      serviceCategory:
        provider && provider.services.length === 1 ? provider.services[0].category : null,
      petId: PETS.length === 1 ? PETS[0].id : null,
      startsAt: '',
      pickupMode: 'owner-home',
      pickupAddress: '',
      careNotes: '',
      termsAccepted: false,
    },
    busy: false,
    error: null,
  });

  if (!provider) {
    return <MissingProvider />;
  }

  const selectedService = state.draft.serviceCategory
    ? provider.services.find((s) => s.category === state.draft.serviceCategory) ?? null
    : null;
  const selectedPet = state.draft.petId
    ? PETS.find((p) => p.id === state.draft.petId) ?? null
    : null;

  const isFinalStep = state.step === 5;

  async function handleNext(): Promise<void> {
    if (!isFinalStep) {
      dispatch({ type: 'next' });
      return;
    }
    // Final step → submit the booking.
    dispatch({ type: 'submit-start' });
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.draft),
      });
      if (!res.ok) throw new Error(`Booking failed (${res.status}).`);
      const { id } = (await res.json()) as { id: string };
      dispatch({ type: 'submit-success' });
      router.push(`/booking/${id}`);
    } catch (e) {
      dispatch({ type: 'submit-error', message: (e as Error).message });
    }
  }

  return (
    <WizardShell
      exitHref={`/providers/${providerId}`}
      exitLabel={`Back to ${provider.name}`}
      totalSteps={5}
      currentStep={state.step}
      onBack={state.step > 1 ? () => dispatch({ type: 'back' }) : null}
      onNext={handleNext}
      nextLabel={isFinalStep ? 'Book this walk' : 'Continue'}
      canAdvance={canAdvance(state)}
      busy={state.busy}
    >
      {state.step === 1 && (
        <Step1Service
          provider={provider}
          selected={state.draft.serviceCategory}
          onPick={(c) => dispatch({ type: 'set', patch: { serviceCategory: c } })}
        />
      )}

      {state.step === 2 && (
        <Step2Pet
          selectedId={state.draft.petId}
          onPick={(id) => dispatch({ type: 'set', patch: { petId: id } })}
        />
      )}

      {state.step === 3 && (
        <Step3WhenWhere
          provider={provider}
          draft={state.draft}
          minStart={minStart}
          onChange={(patch) => dispatch({ type: 'set', patch })}
        />
      )}

      {state.step === 4 && (
        <Step4CareNotes
          notes={state.draft.careNotes}
          onChange={(careNotes) => dispatch({ type: 'set', patch: { careNotes } })}
        />
      )}

      {state.step === 5 && (
        <Step5Review
          provider={provider}
          service={selectedService}
          pet={selectedPet}
          draft={state.draft}
          error={state.error}
          onTermsToggle={(v) => dispatch({ type: 'set', patch: { termsAccepted: v } })}
        />
      )}
    </WizardShell>
  );
}

// ──────────────────────────────────────────────────────────────────
// Step 1 — Service
// ──────────────────────────────────────────────────────────────────

function Step1Service({
  provider,
  selected,
  onPick,
}: {
  provider: MockProvider;
  selected: ServiceCategory | null;
  onPick: (c: ServiceCategory) => void;
}): JSX.Element {
  return (
    <>
      <StepHeading
        eyebrow="Step 1"
        title="What service do you need?"
        subtitle={`${provider.name} offers the services below.`}
      />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {provider.services.map((s) => {
          const isSelected = selected === s.category;
          const hue = CATEGORY_HUE[s.category];
          return (
            <li key={s.category}>
              <button
                type="button"
                onClick={() => onPick(s.category)}
                aria-pressed={isSelected}
                className={[
                  'flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-start transition-colors',
                  isSelected
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-border-subtle bg-surface-raised hover:border-border-strong',
                ].join(' ')}
              >
                <span
                  aria-hidden
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${HUE_ICON_CLASS[hue] ?? HUE_ICON_CLASS.brand}`}
                >
                  <PawPrint className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-base font-bold text-ink-primary">
                    {CATEGORY_LABELS[s.category]}
                  </p>
                  <p className="mt-1 text-xs text-ink-secondary">
                    {formatRate(s)} · {s.defaultDurationMin} min
                  </p>
                </div>
                {isSelected && (
                  <Check className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// Step 2 — Pet
// ──────────────────────────────────────────────────────────────────

function Step2Pet({
  selectedId,
  onPick,
}: {
  selectedId: string | null;
  onPick: (id: string) => void;
}): JSX.Element {
  return (
    <>
      <StepHeading eyebrow="Step 2" title="Which pet?" subtitle="Pick the pet for this booking." />
      <ul className="space-y-3">
        {PETS.map((pet) => {
          const isSelected = selectedId === pet.id;
          return (
            <li key={pet.id}>
              <button
                type="button"
                onClick={() => onPick(pet.id)}
                aria-pressed={isSelected}
                className={[
                  'flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-start transition-colors',
                  isSelected
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-border-subtle bg-surface-raised hover:border-border-strong',
                ].join(' ')}
              >
                <PetAvatar pet={pet} />
                <div className="flex-1">
                  <p className="text-base font-bold text-ink-primary">{pet.name}</p>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    {pet.breed} · {formatAge(pet.dob)}
                  </p>
                </div>
                {isSelected && <Check className="h-5 w-5 text-brand-600" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-center text-xs text-ink-tertiary">
        Need to add a pet? <a href="/pets/new" className="text-ink-link hover:underline">Add a pet →</a>
      </p>
    </>
  );
}

function PetAvatar({ pet }: { pet: MockPet }): JSX.Element {
  return (
    <span className="relative inline-flex h-12 w-12 shrink-0 overflow-hidden rounded-full bg-warm-100">
      {pet.photo ? (
        <Image
          src={pet.photo}
          alt=""
          width={48}
          height={48}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span className="m-auto text-xs font-bold text-warm-700">{pet.name[0]}</span>
      )}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────
// Step 3 — When & where
// ──────────────────────────────────────────────────────────────────

function Step3WhenWhere({
  provider,
  draft,
  minStart,
  onChange,
}: {
  provider: MockProvider;
  draft: BookingDraft;
  minStart: string;
  onChange: (patch: Partial<BookingDraft>) => void;
}): JSX.Element {
  return (
    <>
      <StepHeading
        eyebrow="Step 3"
        title="When & where"
        subtitle={`${provider.name} usually responds within ${provider.responseTimeAvgMin} minutes.`}
      />

      <div className="space-y-6">
        <div>
          <label htmlFor="startsAt" className="mb-2 block text-sm font-semibold text-ink-primary">
            Pick a date and time
          </label>
          <input
            id="startsAt"
            type="datetime-local"
            min={minStart}
            value={draft.startsAt}
            onChange={(e) => onChange({ startsAt: e.target.value })}
            className="block w-full rounded-lg border border-border-subtle bg-surface-raised px-3 py-2.5 text-base text-ink-primary shadow-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <p className="mt-1.5 text-xs text-ink-tertiary">
            Earliest: 1 hour from now.
          </p>
        </div>

        <fieldset>
          <legend className="mb-2 block text-sm font-semibold text-ink-primary">
            Where should the walk start?
          </legend>
          <div className="space-y-2">
            <PickupRadio
              value="owner-home"
              checked={draft.pickupMode === 'owner-home'}
              label="At my home"
              hint="We'll send the address to the walker."
              onChange={(v) => onChange({ pickupMode: v })}
            />
            <PickupRadio
              value="provider-home"
              checked={draft.pickupMode === 'provider-home'}
              label={`At ${provider.name}'s place`}
              hint={provider.baseAddress}
              onChange={(v) => onChange({ pickupMode: v })}
            />
            <PickupRadio
              value="meeting-point"
              checked={draft.pickupMode === 'meeting-point'}
              label="At a meeting point"
              hint="Type an address or landmark."
              onChange={(v) => onChange({ pickupMode: v })}
            />
          </div>
          {draft.pickupMode === 'meeting-point' && (
            <input
              type="text"
              placeholder="e.g. Prospect Park, 9th St entrance"
              value={draft.pickupAddress}
              onChange={(e) => onChange({ pickupAddress: e.target.value })}
              className="mt-3 block w-full rounded-lg border border-border-subtle bg-surface-raised px-3 py-2.5 text-sm text-ink-primary shadow-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          )}
        </fieldset>
      </div>
    </>
  );
}

function PickupRadio({
  value,
  checked,
  label,
  hint,
  onChange,
}: {
  value: PickupMode;
  checked: boolean;
  label: string;
  hint: string;
  onChange: (v: PickupMode) => void;
}): JSX.Element {
  return (
    <label
      className={[
        'flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors',
        checked ? 'border-brand-600 bg-brand-50' : 'border-border-subtle bg-surface-raised hover:border-border-strong',
      ].join(' ')}
    >
      <input
        type="radio"
        name="pickupMode"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-1 h-4 w-4 accent-brand-600"
      />
      <span className="flex-1">
        <span className="block text-sm font-semibold text-ink-primary">{label}</span>
        <span className="mt-0.5 block text-xs text-ink-secondary">{hint}</span>
      </span>
    </label>
  );
}

// ──────────────────────────────────────────────────────────────────
// Step 4 — Care notes
// ──────────────────────────────────────────────────────────────────

function Step4CareNotes({
  notes,
  onChange,
}: {
  notes: string;
  onChange: (notes: string) => void;
}): JSX.Element {
  const max = 500;
  return (
    <>
      <StepHeading
        eyebrow="Step 4"
        title="Anything the walker should know?"
        subtitle="Optional. Helpful for first-time walks with this walker."
      />
      <textarea
        rows={6}
        maxLength={max}
        placeholder="Feeding times, medications, leash quirks, gate codes, allergies…"
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full resize-y rounded-lg border border-border-subtle bg-surface-raised px-3 py-2.5 text-sm text-ink-primary shadow-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
      <p className="mt-1.5 text-end text-xs text-ink-tertiary">
        {notes.length}/{max}
      </p>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// Step 5 — Review & confirm
// ──────────────────────────────────────────────────────────────────

function Step5Review({
  provider,
  service,
  pet,
  draft,
  error,
  onTermsToggle,
}: {
  provider: MockProvider;
  service: MockProviderService | null;
  pet: MockPet | null;
  draft: BookingDraft;
  error: string | null;
  onTermsToggle: (v: boolean) => void;
}): JSX.Element {
  const price = useMemo(() => calculatePrice(service), [service]);
  return (
    <>
      <StepHeading
        eyebrow="Step 5"
        title="Review and confirm"
        subtitle="Almost done. Double-check the details below."
      />

      <div className="space-y-3">
        <SummaryRow label="Service" value={service ? CATEGORY_LABELS[service.category] : '—'} />
        <SummaryRow label="Pet" value={pet ? `${pet.name} · ${pet.breed}` : '—'} />
        <SummaryRow label="When" value={draft.startsAt ? formatStart(draft.startsAt) : '—'} />
        <SummaryRow
          label="Where"
          value={
            draft.pickupMode === 'owner-home'
              ? 'At your home'
              : draft.pickupMode === 'provider-home'
                ? `At ${provider.name}'s place`
                : draft.pickupAddress || '—'
          }
        />
        {draft.careNotes && (
          <SummaryRow label="Care notes" value={draft.careNotes} multiline />
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border-subtle bg-warm-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary">
          Price
        </p>
        <dl className="mt-2 space-y-1.5 text-sm">
          <PriceLine label={`Base ${service ? CATEGORY_LABELS[service.category].toLowerCase() : ''} rate`} cents={price.base} />
          <PriceLine label="Service fee" cents={price.fee} />
          <div className="my-1.5 border-t border-border-subtle" />
          <PriceLine label="Total" cents={price.total} bold />
        </dl>
        <p className="mt-2 text-xs text-ink-tertiary">
          You won't be charged until {provider.name} confirms the booking.
        </p>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg p-2">
        <input
          type="checkbox"
          checked={draft.termsAccepted}
          onChange={(e) => onTermsToggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brand-600"
        />
        <span className="text-xs leading-relaxed text-ink-secondary">
          I agree to PetWalker's <a href="/terms" className="text-ink-link underline-offset-2 hover:underline">Terms</a> and the{' '}
          <a href="/terms#cancellation" className="text-ink-link underline-offset-2 hover:underline">cancellation policy</a>.
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-coral-200 bg-coral-100 px-3 py-2 text-sm font-medium text-coral-700"
        >
          {error}
        </p>
      )}
    </>
  );
}

function SummaryRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}): JSX.Element {
  return (
    <div className="rounded-lg bg-surface-raised p-3 ring-1 ring-border-subtle">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">{label}</p>
      <p className={['mt-1 text-sm font-medium text-ink-primary', multiline ? 'whitespace-pre-wrap' : ''].join(' ')}>
        {value}
      </p>
    </div>
  );
}

function PriceLine({
  label,
  cents,
  bold = false,
}: {
  label: string;
  cents: number;
  bold?: boolean;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <dt className={bold ? 'font-bold text-ink-primary' : 'text-ink-secondary'}>{label}</dt>
      <dd className={bold ? 'font-bold text-ink-primary' : 'text-ink-primary'}>
        ${(cents / 100).toFixed(2)}
      </dd>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Missing-provider error surface
// ──────────────────────────────────────────────────────────────────

function MissingProvider(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base px-6 text-center">
      <MapPin className="h-10 w-10 text-ink-tertiary" aria-hidden />
      <h1 className="mt-4 text-xl font-bold text-ink-primary">No provider selected</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-secondary">
        Bookings start from a provider's profile. Browse search results to pick someone.
      </p>
      <a
        href="/search"
        className="mt-6 inline-flex min-h-touch items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 text-sm font-semibold text-ink-inverse hover:bg-brand-700"
      >
        Browse providers
      </a>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function formatRate(s: MockProviderService): string {
  if (s.hourlyRateCents) return `$${(s.hourlyRateCents / 100).toFixed(0)}/hr`;
  if (s.perStayRateCents) return `$${(s.perStayRateCents / 100).toFixed(0)}/stay`;
  return '—';
}

function formatAge(dob: Date): string {
  const ms = Date.now() - dob.getTime();
  const yrs = ms / (365.25 * 24 * 60 * 60_000);
  if (yrs < 1) return `${Math.round(yrs * 12)} mo`;
  return `${Math.floor(yrs)} yr`;
}

function formatStart(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function calculatePrice(service: MockProviderService | null): {
  base: number;
  fee: number;
  total: number;
} {
  if (!service) return { base: 0, fee: 0, total: 0 };
  const baseRate = service.hourlyRateCents ?? service.perStayRateCents ?? 0;
  const durationHours = service.defaultDurationMin / 60;
  const base = service.hourlyRateCents
    ? Math.round(baseRate * durationHours)
    : baseRate;
  const fee = Math.round(base * 0.14); // 14% platform fee — consistent with mock data
  return { base, fee, total: base + fee };
}
