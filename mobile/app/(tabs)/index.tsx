import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';

import type { Booking, User } from '@petwalker/shared/types';

export default function Home(): JSX.Element {
  const me = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
  });
  const upcoming = useQuery({
    queryKey: ['bookings', 'upcoming-home'],
    queryFn: () => api.bookings.list({ limit: 3 }),
  });

  const next: Booking | undefined = upcoming.data?.items[0];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: '600' }}>petwalker</Text>
        <Text style={{ marginTop: 4, color: '#64748b' }}>
          {me.data?.fullName ? `Hi, ${me.data.fullName.split(' ')[0]}.` : 'Welcome.'}
        </Text>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
          <Quick href="/(tabs)/providers" icon="search-outline" label="Find" />
          <Quick href="/(tabs)/pets" icon="paw-outline" label="Pets" />
          <Quick href="/(tabs)/bookings" icon="calendar-outline" label="Bookings" />
        </View>

        <Text style={{ marginTop: 32, fontWeight: '600', fontSize: 16 }}>Next booking</Text>
        {upcoming.isLoading ? (
          <Text style={{ color: '#64748b', marginTop: 8 }}>Loading…</Text>
        ) : next ? (
          <View
            style={{
              marginTop: 8,
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e2e8f0',
            }}
          >
            <Text style={{ fontWeight: '600', textTransform: 'capitalize' }}>
              {next.serviceType} · {next.status.replace('_', ' ')}
            </Text>
            <Text style={{ color: '#64748b', marginTop: 4 }}>
              {new Date(next.scheduledAt).toLocaleString()} · {next.durationMin} min
            </Text>
          </View>
        ) : (
          <Text style={{ color: '#64748b', marginTop: 8 }}>
            No upcoming bookings — tap Find to book one.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Quick({
  href,
  icon,
  label,
}: {
  href: '/(tabs)/providers' | '/(tabs)/pets' | '/(tabs)/bookings';
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}): JSX.Element {
  return (
    <Link href={href} asChild>
      <Pressable
        style={{
          flex: 1,
          padding: 16,
          borderRadius: 14,
          backgroundColor: '#f1f5f9',
          alignItems: 'center',
        }}
      >
        <Ionicons name={icon} size={26} color="#4456f0" />
        <Text style={{ marginTop: 6, fontWeight: '600', color: '#1e293b' }}>{label}</Text>
      </Pressable>
    </Link>
  );
}
