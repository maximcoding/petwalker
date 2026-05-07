import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';

import type { CreateBookingDto } from '@petwalker/shared/dto';
import type { Booking, Pet, ServiceProviderDetail } from '@petwalker/shared/types';

const DURATIONS = [30, 60, 90, 120] as const;

export default function ProviderDetail(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const provider = useQuery<ServiceProviderDetail>({
    queryKey: ['provider', id],
    queryFn: () => api.providers.get(id!),
    enabled: !!id,
  });
  const pets = useQuery({
    queryKey: ['pets', 'first-page-for-booking'],
    queryFn: () => api.pets.list({ limit: 100 }),
    select: (page) => page.items as Pet[],
  });

  const [serviceIdx, setServiceIdx] = useState(0);
  const [petId, setPetId] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(60);
  // Default to tomorrow at 10:00 local; user picks the actual time.
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  function handleDateChange(_e: DateTimePickerEvent, picked?: Date): void {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (!picked) return;
    setScheduledDate((prev) => {
      const next = new Date(prev);
      next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
      return next;
    });
  }

  function handleTimeChange(_e: DateTimePickerEvent, picked?: Date): void {
    if (Platform.OS !== 'ios') setShowTimePicker(false);
    if (!picked) return;
    setScheduledDate((prev) => {
      const next = new Date(prev);
      next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      return next;
    });
  }

  const offering = provider.data?.offerings[serviceIdx];
  const previewCents = offering ? Math.round(offering.hourlyRateCents * (duration / 60)) : 0;

  const m = useMutation<Booking, Error, CreateBookingDto>({
    mutationFn: (body) => api.bookings.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['bookings'] });
      // Drop the user on the Bookings tab where the new booking card has an
      // inline Pay button (Apple Pay / Google Pay / cards via PaymentSheet,
      // or the dev-mode mock confirm).
      Alert.alert('Booked!', 'Tap "Pay" on the booking to confirm.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/bookings') },
      ]);
    },
    onError: (e) => Alert.alert('Could not book', e.message),
  });

  const defaultPetId = useMemo(() => pets.data?.[0]?.id ?? null, [pets.data]);
  const effectivePetId = petId ?? defaultPetId;

  if (provider.isLoading || pets.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  if (provider.error || !provider.data) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Text style={{ padding: 24, color: '#dc2626' }}>
          {(provider.error as Error)?.message ?? 'Not found'}
        </Text>
      </SafeAreaView>
    );
  }

  const p = provider.data;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 22, fontWeight: '600' }}>{p.fullName}</Text>
          {p.verified ? (
            <Text style={{ marginLeft: 8, color: '#059669', fontSize: 12 }}>verified</Text>
          ) : null}
        </View>
        <Text style={{ color: '#64748b', marginTop: 4 }}>
          Service radius {p.serviceRadiusKm} km
          {p.rating != null ? `  ·  ★ ${p.rating.toFixed(1)} (${p.reviewCount})` : ''}
        </Text>
        {p.bio ? <Text style={{ marginTop: 12, color: '#334155' }}>{p.bio}</Text> : null}

        <Text style={{ marginTop: 24, marginBottom: 8, fontWeight: '600' }}>Service</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {p.offerings.map((o, i) => {
            const active = i === serviceIdx;
            return (
              <Pressable
                key={o.serviceType}
                onPress={() => setServiceIdx(i)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? '#4456f0' : '#cbd5e1',
                  backgroundColor: active ? '#eef2ff' : 'white',
                }}
              >
                <Text style={{ color: active ? '#4456f0' : '#475569', textTransform: 'capitalize' }}>
                  {o.serviceType} · ${(o.hourlyRateCents / 100).toFixed(0)}/h
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={{ marginTop: 20, marginBottom: 8, fontWeight: '600' }}>Pet</Text>
        {pets.data && pets.data.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {pets.data.map((pet) => {
              const active = effectivePetId === pet.id;
              return (
                <Pressable
                  key={pet.id}
                  onPress={() => setPetId(pet.id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? '#4456f0' : '#cbd5e1',
                    backgroundColor: active ? '#eef2ff' : 'white',
                  }}
                >
                  <Text style={{ color: active ? '#4456f0' : '#475569' }}>{pet.name}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={{ color: '#64748b' }}>
            Add a pet from the Pets tab before booking.
          </Text>
        )}

        <Text style={{ marginTop: 20, marginBottom: 8, fontWeight: '600' }}>Duration</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DURATIONS.map((d) => {
            const active = d === duration;
            return (
              <Pressable
                key={d}
                onPress={() => setDuration(d)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? '#4456f0' : '#cbd5e1',
                  backgroundColor: active ? '#eef2ff' : 'white',
                }}
              >
                <Text style={{ color: active ? '#4456f0' : '#475569' }}>{d} min</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={{ marginTop: 20, marginBottom: 8, fontWeight: '600' }}>When</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: '#cbd5e1',
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#64748b', fontSize: 12 }}>Date</Text>
            <Text style={{ fontWeight: '500', marginTop: 2 }}>
              {scheduledDate.toLocaleDateString()}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowTimePicker(true)}
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: '#cbd5e1',
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#64748b', fontSize: 12 }}>Time</Text>
            <Text style={{ fontWeight: '500', marginTop: 2 }}>
              {scheduledDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </Pressable>
        </View>
        {showDatePicker ? (
          <DateTimePicker
            mode="date"
            value={scheduledDate}
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        ) : null}
        {showTimePicker ? (
          <DateTimePicker
            mode="time"
            value={scheduledDate}
            onChange={handleTimeChange}
          />
        ) : null}

        <View
          style={{
            marginTop: 24,
            padding: 14,
            borderRadius: 12,
            backgroundColor: '#f8fafc',
          }}
        >
          <Text style={{ color: '#64748b', fontSize: 13 }}>
            Booking {scheduledDate.toLocaleString()}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 18, fontWeight: '600' }}>
            ≈ ${(previewCents / 100).toFixed(2)}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
            {offering ? `${offering.serviceType} · ${duration} min` : ''}
          </Text>
        </View>

        <Pressable
          disabled={!effectivePetId || !offering || m.isPending}
          onPress={() => {
            if (!effectivePetId || !offering) return;
            if (scheduledDate.getTime() <= Date.now()) {
              Alert.alert('Pick a future date and time');
              return;
            }
            m.mutate({
              providerId: p.userId,
              petId: effectivePetId,
              serviceType: offering.serviceType,
              scheduledAt: scheduledDate.toISOString(),
              durationMin: duration,
              notes: null,
            });
          }}
          style={{
            marginTop: 16,
            backgroundColor: !effectivePetId || m.isPending ? '#94a3b8' : '#4456f0',
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
            {m.isPending ? 'Booking…' : 'Confirm booking'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
