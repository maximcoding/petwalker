import { useInfiniteQuery } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';

import type { Pet } from '@petwalker/shared/types';

type Router = ReturnType<typeof useRouter>;

const PAGE_SIZE = 30;

export default function PetsList(): JSX.Element {
  const router = useRouter();
  const q = useInfiniteQuery({
    queryKey: ['pets'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.pets.list({ cursor: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const items: Pet[] = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1 }}>
        {q.isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : q.error ? (
          <Text style={{ padding: 24, color: '#dc2626' }}>
            Error: {(q.error as Error).message}
          </Text>
        ) : items.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center', marginTop: 64 }}>
            <Text style={{ color: '#64748b', marginBottom: 12 }}>No pets yet.</Text>
            <Pressable
              onPress={() => router.push('/(tabs)/pets/new')}
              style={{
                backgroundColor: '#4456f0',
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Add your first pet</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={{ padding: 16, gap: 12 }}
            data={items}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => <PetCard pet={item} router={router} />}
            refreshing={q.isFetching && !q.isFetchingNextPage}
            onRefresh={() => q.refetch()}
            onEndReached={() => {
              if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              q.isFetchingNextPage ? (
                <ActivityIndicator style={{ margin: 12 }} />
              ) : null
            }
          />
        )}

        {items.length > 0 ? (
          <Link href="/(tabs)/pets/new" asChild>
            <Pressable
              style={{
                position: 'absolute',
                right: 20,
                bottom: 24,
                backgroundColor: '#4456f0',
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <Text style={{ color: 'white', fontSize: 28, lineHeight: 30 }}>+</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function PetCard({ pet, router }: { pet: Pet; router: Router }): JSX.Element {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(tabs)/pets/[id]', params: { id: pet.id } })}
      style={{
        flexDirection: 'row',
        gap: 12,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
      }}
    >
      {pet.photoUrl ? (
        <Image
          source={{ uri: pet.photoUrl }}
          style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#f1f5f9' }}
        />
      ) : (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            backgroundColor: '#f1f5f9',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#94a3b8', fontSize: 24 }}>🐾</Text>
        </View>
      )}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{pet.name}</Text>
        <Text style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
          {pet.breed ?? pet.species}
          {pet.weightKg != null ? ` · ${pet.weightKg} kg` : ''}
          {pet.ageYears != null ? ` · ${pet.ageYears} yo` : ''}
        </Text>
      </View>
    </Pressable>
  );
}
