import { SERVICE_TYPES, ServiceType } from '@petwalker/shared/enums';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field } from '@/components/Field';
import { api } from '@/lib/api';
import { getDeviceLocation, SEED_LOCATION, type Coords } from '@/lib/geolocation';

import type { ServiceProviderListing } from '@petwalker/shared/types';

export default function ProvidersSearch(): JSX.Element {
  const [serviceType, setServiceType] = useState<ServiceType>(ServiceType.Walking);
  const [radius, setRadius] = useState('10');
  const [maxPrice, setMaxPrice] = useState('');
  const [searched, setSearched] = useState(false);
  const [coords, setCoords] = useState<Coords>(SEED_LOCATION);
  const [locating, setLocating] = useState(false);
  const [usingDevice, setUsingDevice] = useState(false);

  async function useMyLocation(): Promise<void> {
    setLocating(true);
    try {
      const c = await getDeviceLocation();
      if (c) {
        setCoords(c);
        setUsingDevice(true);
      } else {
        Alert.alert('Location unavailable', 'Falling back to NYC seed coordinates.');
        setCoords(SEED_LOCATION);
        setUsingDevice(false);
      }
    } finally {
      setLocating(false);
    }
  }

  const radiusKm = Math.max(1, Math.min(100, Number(radius) || 10));
  const maxHourlyCents = maxPrice
    ? Math.round(Math.max(0, Number(maxPrice)) * 100)
    : undefined;

  const q = useInfiniteQuery({
    queryKey: ['providers', { serviceType, radiusKm, maxHourlyCents, coords }],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.providers.search({
        serviceType,
        lat: coords.lat,
        lng: coords.lng,
        radiusKm,
        maxHourlyCents,
        cursor: pageParam,
        limit: 20,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: searched,
  });

  const items: ServiceProviderListing[] = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 6 }}>Service</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {SERVICE_TYPES.map((s) => {
            const active = s === serviceType;
            return (
              <Pressable
                key={s}
                onPress={() => setServiceType(s)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? '#4456f0' : '#cbd5e1',
                  backgroundColor: active ? '#eef2ff' : 'white',
                }}
              >
                <Text
                  style={{
                    color: active ? '#4456f0' : '#475569',
                    fontWeight: active ? '600' : '400',
                    textTransform: 'capitalize',
                  }}
                >
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Radius (km)"
              value={radius}
              onChangeText={setRadius}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Max $/h (optional)"
              value={maxPrice}
              onChangeText={setMaxPrice}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Text style={{ color: '#64748b', fontSize: 12 }}>
            {usingDevice
              ? `Searching near you (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})`
              : 'Searching near NYC (default)'}
          </Text>
          <Pressable
            onPress={useMyLocation}
            disabled={locating}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: '#eef2ff',
            }}
          >
            <Text style={{ color: '#4456f0', fontSize: 12, fontWeight: '600' }}>
              {locating ? 'Locating…' : usingDevice ? 'Refresh' : 'Use my location'}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            setSearched(true);
            void q.refetch();
          }}
          style={{
            backgroundColor: '#4456f0',
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Search</Text>
        </Pressable>
      </View>

      {!searched ? (
        <Text style={{ paddingHorizontal: 16, color: '#64748b' }}>
          Pick a service and tap Search to see providers near NYC.
        </Text>
      ) : q.isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : q.error ? (
        <Text style={{ padding: 16, color: '#dc2626' }}>
          Error: {(q.error as Error).message}
        </Text>
      ) : items.length === 0 ? (
        <Text style={{ padding: 16, color: '#64748b' }}>
          No providers match. Try a wider radius or different service.
        </Text>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, gap: 12 }}
          data={items}
          keyExtractor={(p) => p.userId}
          renderItem={({ item }) => <ProviderRow provider={item} />}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            q.isFetchingNextPage ? <ActivityIndicator style={{ margin: 12 }} /> : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function ProviderRow({ provider }: { provider: ServiceProviderListing }): JSX.Element {
  const offering = provider.offerings[0];
  return (
    <Link href={{ pathname: '/(tabs)/providers/[id]', params: { id: provider.userId } }} asChild>
      <Pressable
        style={{
          padding: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#e2e8f0',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>{provider.fullName}</Text>
          {provider.verified ? (
            <Text style={{ color: '#059669', fontSize: 12 }}>verified</Text>
          ) : null}
        </View>
        <Text style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
          {(provider.distanceM / 1000).toFixed(1)} km away
          {offering ? ` · $${(offering.hourlyRateCents / 100).toFixed(2)}/h` : ''}
          {provider.rating != null
            ? ` · ★ ${provider.rating.toFixed(1)} (${provider.reviewCount})`
            : ''}
        </Text>
        {provider.bio ? (
          <Text
            numberOfLines={2}
            style={{ color: '#475569', fontSize: 13, marginTop: 6 }}
          >
            {provider.bio}
          </Text>
        ) : null}
      </Pressable>
    </Link>
  );
}
