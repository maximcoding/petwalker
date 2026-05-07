import {
  SERVICE_TYPES,
  ServiceType,
  UserRole,
} from '@petwalker/shared/enums';
import type { AvailabilitySlot } from '@petwalker/shared/types';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { signOut } from '@/lib/auth';

import * as WebBrowser from 'expo-web-browser';

import { Field } from '@/components/Field';
import { getDeviceLocation } from '@/lib/geolocation';

import type {
  ServiceOffering,
  ServiceProviderProfile,
  StripeAccount,
  User,
} from '@petwalker/shared/types';
import type { EarningsSummary } from '@petwalker/shared';

export default function Profile(): JSX.Element {
  const router = useRouter();
  const me = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
  });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 16 }}>Profile</Text>

        {me.isLoading ? (
          <ActivityIndicator />
        ) : me.error ? (
          <Text style={{ color: '#dc2626' }}>Error: {(me.error as Error).message}</Text>
        ) : me.data ? (
          <>
            <Card title="Account">
              <AccountSection me={me.data} />
            </Card>

            <Card title="Role">
              <RoleSwitcher me={me.data} />
            </Card>

            {me.data.role === UserRole.Provider || me.data.role === UserRole.Both ? (
              <>
                <Card title="Provider profile">
                  <ProviderProfileSection />
                </Card>
                <Card title="Offerings">
                  <OfferingsSection />
                </Card>
                <Card title="Weekly availability">
                  <AvailabilitySection />
                </Card>
                <Card title="Payouts">
                  <StripeSection />
                </Card>
              </>
            ) : (
              <Card title="Become a provider">
                <Text style={{ color: '#64748b', fontSize: 14 }}>
                  Switch to Provider above to set your prices and weekly schedule.
                </Text>
              </Card>
            )}
          </>
        ) : null}

        <Pressable
          onPress={async () => {
            await signOut();
            router.replace('/(auth)/sign-in');
          }}
          style={{
            marginTop: 24,
            backgroundColor: '#fee2e2',
            borderRadius: 10,
            padding: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#dc2626', fontWeight: '600' }}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ────────────── shared bits ──────────────

function Card({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <View
      style={{
        marginBottom: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
      }}
    >
      <Text style={{ fontWeight: '600', marginBottom: 12, fontSize: 15 }}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: '#64748b' }}>{label}</Text>
      <Text style={{ fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

// ────────────── account (editable) ──────────────

function AccountSection({ me }: { me: User }): JSX.Element {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(me.fullName ?? '');
  const [phone, setPhone] = useState(me.phone ?? '');

  const m = useMutation({
    mutationFn: () =>
      api.users.updateMe({
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || null,
      }),
    onSuccess: (next) => qc.setQueryData(['me'], next),
    onError: (e: Error) => Alert.alert('Save failed', e.message),
  });

  return (
    <View>
      <Field label="Name" value={fullName} onChangeText={setFullName} />
      <Field
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+15551234567"
      />
      <Row label="Email" value={me.email} />
      <Pressable
        onPress={() => m.mutate()}
        disabled={m.isPending}
        style={{
          marginTop: 12,
          backgroundColor: m.isPending ? '#94a3b8' : '#4456f0',
          paddingVertical: 12,
          borderRadius: 10,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {m.isPending ? 'Saving…' : 'Save'}
        </Text>
      </Pressable>
    </View>
  );
}

// ────────────── provider profile (bio + base location + radius) ──────────────

function ProviderProfileSection(): JSX.Element {
  const qc = useQueryClient();
  const q = useQuery<ServiceProviderProfile | null>({
    queryKey: ['service-profile'],
    queryFn: () => api.users.getServiceProfile(),
  });

  const [bio, setBio] = useState('');
  const [radius, setRadius] = useState('10');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!q.data) return;
    setBio(q.data.bio ?? '');
    setRadius(String(q.data.serviceRadiusKm ?? 10));
    setLat(q.data.baseLat != null ? String(q.data.baseLat) : '');
    setLng(q.data.baseLng != null ? String(q.data.baseLng) : '');
  }, [q.data]);

  async function useMyLocation(): Promise<void> {
    setLocating(true);
    try {
      const c = await getDeviceLocation();
      if (!c) {
        Alert.alert('Location unavailable', 'Permission denied or hardware error.');
        return;
      }
      setLat(c.lat.toFixed(6));
      setLng(c.lng.toFixed(6));
    } finally {
      setLocating(false);
    }
  }

  const m = useMutation({
    mutationFn: () => {
      const r = Number(radius);
      const la = lat.trim() === '' ? null : Number(lat);
      const lo = lng.trim() === '' ? null : Number(lng);
      if (
        Number.isNaN(r) ||
        (la != null && Number.isNaN(la)) ||
        (lo != null && Number.isNaN(lo))
      ) {
        return Promise.reject(new Error('Radius / lat / lng must be numbers'));
      }
      return api.users.upsertServiceProfile({
        bio: bio.trim() || null,
        serviceRadiusKm: r,
        baseLat: la,
        baseLng: lo,
      });
    },
    onSuccess: (next) => qc.setQueryData(['service-profile'], next),
    onError: (e: Error) => Alert.alert('Save failed', e.message),
  });

  if (q.isLoading) return <ActivityIndicator />;

  return (
    <View>
      <Field
        label="Bio"
        value={bio}
        onChangeText={setBio}
        multiline
        style={{ minHeight: 70, textAlignVertical: 'top' }}
        placeholder="Owners see this on your profile"
      />
      <Field
        label="Service radius (km)"
        value={radius}
        onChangeText={setRadius}
        keyboardType="number-pad"
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Base latitude"
            value={lat}
            onChangeText={setLat}
            keyboardType="decimal-pad"
            placeholder="40.7128"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Base longitude"
            value={lng}
            onChangeText={setLng}
            keyboardType="decimal-pad"
            placeholder="-74.0060"
          />
        </View>
      </View>
      <Pressable
        onPress={useMyLocation}
        disabled={locating}
        style={{
          marginBottom: 8,
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: '#eef2ff',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#4456f0', fontWeight: '600' }}>
          {locating ? 'Locating…' : 'Use my location'}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => m.mutate()}
        disabled={m.isPending}
        style={{
          marginTop: 4,
          backgroundColor: m.isPending ? '#94a3b8' : '#4456f0',
          paddingVertical: 12,
          borderRadius: 10,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {m.isPending ? 'Saving…' : 'Save provider profile'}
        </Text>
      </Pressable>
    </View>
  );
}

// ────────────── role switcher ──────────────

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: UserRole.Owner, label: 'Owner' },
  { value: UserRole.Provider, label: 'Provider' },
  { value: UserRole.Both, label: 'Both' },
];

function RoleSwitcher({ me }: { me: User }): JSX.Element {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (role: UserRole) => api.users.updateMe({ role }),
    onSuccess: (next) => {
      qc.setQueryData(['me'], next);
      void qc.invalidateQueries({ queryKey: ['offerings'] });
    },
    onError: (e: Error) => Alert.alert('Could not switch role', e.message),
  });

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {ROLE_OPTIONS.map((opt) => {
        const active = me.role === opt.value;
        return (
          <Pressable
            key={opt.value}
            disabled={m.isPending}
            onPress={() => {
              if (!active) m.mutate(opt.value);
            }}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: active ? '#4456f0' : '#cbd5e1',
              backgroundColor: active ? '#eef2ff' : 'white',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: active ? '#4456f0' : '#475569', fontWeight: '600' }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ────────────── offerings (provider only) ──────────────

function OfferingsSection(): JSX.Element {
  const q = useQuery<ServiceOffering[]>({
    queryKey: ['offerings'],
    queryFn: () => api.users.listMyOfferings(),
  });

  if (q.isLoading) return <ActivityIndicator />;
  if (q.error) {
    return <Text style={{ color: '#dc2626' }}>Error: {(q.error as Error).message}</Text>;
  }

  const byType = new Map<ServiceType, ServiceOffering>();
  (q.data ?? []).forEach((o) => byType.set(o.serviceType, o));

  return (
    <View style={{ gap: 10 }}>
      {SERVICE_TYPES.map((t) => (
        <OfferingRow key={t} serviceType={t} offering={byType.get(t)} />
      ))}
    </View>
  );
}

function OfferingRow({
  serviceType,
  offering,
}: {
  serviceType: ServiceType;
  offering: ServiceOffering | undefined;
}): JSX.Element {
  const qc = useQueryClient();
  const [hourly, setHourly] = useState(
    offering ? (offering.hourlyRateCents / 100).toFixed(2) : '',
  );
  const [active, setActive] = useState(offering?.active ?? true);

  // Keep local state in sync if the row was just created/updated.
  useEffect(() => {
    if (offering) {
      setHourly((offering.hourlyRateCents / 100).toFixed(2));
      setActive(offering.active);
    }
  }, [offering]);

  const upsert = useMutation({
    mutationFn: () => {
      const cents = Math.round(Number(hourly) * 100);
      if (Number.isNaN(cents) || cents < 0) {
        return Promise.reject(new Error('Enter a valid price'));
      }
      return api.users.upsertOffering({ serviceType, hourlyRateCents: cents, active });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offerings'] }),
    onError: (e: Error) => Alert.alert('Save failed', e.message),
  });

  const remove = useMutation({
    mutationFn: () => api.users.removeOffering(serviceType),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offerings'] }),
  });

  const busy = upsert.isPending || remove.isPending;

  return (
    <View
      style={{
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#fff',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontWeight: '600', textTransform: 'capitalize' }}>{serviceType}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, color: '#64748b' }}>Active</Text>
          <Switch value={active} onValueChange={setActive} />
        </View>
      </View>

      <View
        style={{
          marginTop: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Text style={{ color: '#64748b' }}>$</Text>
        <TextInput
          value={hourly}
          onChangeText={setHourly}
          keyboardType="decimal-pad"
          placeholder="25.00"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#d1d5db',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        />
        <Text style={{ color: '#64748b' }}>/h</Text>
        <Pressable
          disabled={busy}
          onPress={() => upsert.mutate()}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: '#eef2ff',
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#4456f0', fontWeight: '600' }}>
            {offering ? 'Save' : 'Add'}
          </Text>
        </Pressable>
        {offering ? (
          <Pressable
            disabled={busy}
            onPress={() => remove.mutate()}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: '#fee2e2',
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#dc2626', fontWeight: '600' }}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ────────────── availability (provider only) ──────────────

const DAYS: { value: 0 | 1 | 2 | 3 | 4 | 5 | 6; label: string }[] = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function AvailabilitySection(): JSX.Element {
  const qc = useQueryClient();
  const q = useQuery<AvailabilitySlot[]>({
    queryKey: ['availability'],
    queryFn: () => api.users.getAvailability(),
  });

  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);

  useEffect(() => {
    if (q.data) setSlots(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: (next: AvailabilitySlot[]) =>
      api.users.replaceAvailability({ slots: next }),
    onSuccess: (next) => qc.setQueryData(['availability'], next),
    onError: (e: Error) => Alert.alert('Save failed', e.message),
  });

  function patch(idx: number, p: Partial<AvailabilitySlot>): void {
    setSlots((s) => s.map((slot, i) => (i === idx ? { ...slot, ...p } : slot)));
  }

  function add(): void {
    setSlots((s) => [...s, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]);
  }

  function remove(idx: number): void {
    setSlots((s) => s.filter((_, i) => i !== idx));
  }

  function commit(): void {
    for (const s of slots) {
      if (!HHMM.test(s.startTime) || !HHMM.test(s.endTime)) {
        Alert.alert('Times must be HH:MM (24h)');
        return;
      }
      if (s.startTime >= s.endTime) {
        Alert.alert('Each slot must end after it starts');
        return;
      }
    }
    save.mutate(slots);
  }

  if (q.isLoading) return <ActivityIndicator />;
  if (q.error) {
    return <Text style={{ color: '#dc2626' }}>Error: {(q.error as Error).message}</Text>;
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#64748b', fontSize: 12 }}>
        Recurring weekly slots in UTC. Owners can only book inside one of these.
      </Text>

      {slots.length === 0 ? (
        <Text style={{ color: '#94a3b8', fontStyle: 'italic' }}>
          No availability — owners can&apos;t book you yet.
        </Text>
      ) : null}

      {slots.map((s, i) => (
        <View
          key={i}
          style={{
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            gap: 8,
          }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {DAYS.map((d) => {
              const active = d.value === s.dayOfWeek;
              return (
                <Pressable
                  key={d.value}
                  onPress={() => patch(i, { dayOfWeek: d.value })}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: active ? '#4456f0' : '#f1f5f9',
                  }}
                >
                  <Text
                    style={{
                      color: active ? 'white' : '#475569',
                      fontWeight: active ? '600' : '500',
                      fontSize: 12,
                    }}
                  >
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: '#64748b', width: 36 }}>From</Text>
            <TextInput
              value={s.startTime}
              onChangeText={(t) => patch(i, { startTime: t })}
              placeholder="09:00"
              maxLength={5}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#d1d5db',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            />
            <Text style={{ color: '#64748b', width: 24 }}>To</Text>
            <TextInput
              value={s.endTime}
              onChangeText={(t) => patch(i, { endTime: t })}
              placeholder="17:00"
              maxLength={5}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#d1d5db',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            />
            <Pressable
              onPress={() => remove(i)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: '#fee2e2',
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#dc2626', fontWeight: '600' }}>×</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Pressable
          onPress={add}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: '#f1f5f9',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#475569', fontWeight: '600' }}>+ Add slot</Text>
        </Pressable>
        <Pressable
          onPress={commit}
          disabled={save.isPending}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: save.isPending ? '#94a3b8' : '#4456f0',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>
            {save.isPending ? 'Saving…' : 'Save schedule'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ────────────── stripe (provider only) ──────────────

function StripeSection(): JSX.Element {
  const qc = useQueryClient();
  const account = useQuery<StripeAccount | null>({
    queryKey: ['stripe-account'],
    queryFn: () => api.payments.account(),
  });
  const earnings = useQuery<EarningsSummary>({
    queryKey: ['earnings'],
    queryFn: () => api.payments.earnings(),
  });

  const onboard = useMutation({
    mutationFn: () => api.payments.connectOnboard(),
    onSuccess: async (link) => {
      // WebBrowser handles both:
      //   • dev mock: returns a 200 page → user dismisses → we refetch and the
      //     account now shows charges_enabled (the dev impl auto-onboards on
      //     createAccountLink and fires a webhook).
      //   • real Stripe: hosted onboarding flow inside an in-app browser.
      try {
        await WebBrowser.openAuthSessionAsync(link.url, 'petwalker://profile');
      } catch {
        // ignore — dismiss should be enough
      }
      // Wait a beat for the webhook to land before refetching.
      setTimeout(() => {
        void qc.invalidateQueries({ queryKey: ['stripe-account'] });
        void qc.invalidateQueries({ queryKey: ['earnings'] });
      }, 1200);
    },
    onError: (e: Error) => Alert.alert('Could not start onboarding', e.message),
  });

  if (account.isLoading) return <ActivityIndicator />;

  const has = !!account.data;
  const onboarded = account.data?.chargesEnabled === true;
  const totalCents = earnings.data?.totalCents ?? 0;
  const payoutCents = earnings.data?.payoutCents ?? 0;
  const feesCents = totalCents - payoutCents;

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600' }}>Status</Text>
          <Text
            style={{
              fontSize: 12,
              color: onboarded ? '#059669' : has ? '#d97706' : '#64748b',
            }}
          >
            {onboarded
              ? 'Onboarded — payouts enabled'
              : has
                ? 'Pending — finish Stripe onboarding'
                : 'Not started'}
          </Text>
        </View>
        <Pressable
          onPress={() => onboard.mutate()}
          disabled={onboard.isPending}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: onboard.isPending ? '#94a3b8' : '#4456f0',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>
            {onboard.isPending
              ? 'Opening…'
              : onboarded
                ? 'Update'
                : has
                  ? 'Resume'
                  : 'Set up Stripe'}
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <EarningsStat label="Gross" value={fmtMoney(totalCents)} />
        <EarningsStat label="Fees" value={`-${fmtMoney(feesCents)}`} />
        <EarningsStat label="Net" value={fmtMoney(payoutCents)} accent />
      </View>

      <Text style={{ color: '#64748b', fontSize: 11 }}>
        Platform fee: 15%. Apple Pay / Google Pay supported in PaymentSheet on
        capable devices when real Stripe keys are configured.
      </Text>
    </View>
  );
}

function EarningsStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}): JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        padding: 10,
        borderRadius: 10,
        backgroundColor: accent ? '#eef2ff' : '#f1f5f9',
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 11 }}>{label}</Text>
      <Text style={{ fontWeight: '600', marginTop: 2, color: accent ? '#4456f0' : '#0f172a' }}>
        {value}
      </Text>
    </View>
  );
}

function fmtMoney(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}
