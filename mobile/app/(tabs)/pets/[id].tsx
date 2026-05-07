import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field } from '@/components/Field';
import { api } from '@/lib/api';
import { pickAndUploadImage } from '@/lib/photo-upload';

import type { UpdatePetDto } from '@petwalker/shared/dto';
import type { Pet } from '@petwalker/shared/types';

export default function EditPet(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const q = useQuery<Pet>({
    queryKey: ['pet', id],
    queryFn: () => api.pets.get(id!),
    enabled: !!id,
  });

  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Hydrate fields once the pet loads.
  useEffect(() => {
    if (!q.data) return;
    setName(q.data.name);
    setBreed(q.data.breed ?? '');
    setWeight(q.data.weightKg != null ? String(q.data.weightKg) : '');
    setAge(q.data.ageYears != null ? String(q.data.ageYears) : '');
    setNotes(q.data.notes ?? '');
    setPhotoUrl(q.data.photoUrl ?? null);
  }, [q.data]);

  // Two mutations on purpose:
  //  - `update` (fired by Save) navigates back on success
  //  - `patch`  (fired by photo-change) silently persists, stays on screen
  const update = useMutation<Pet, Error, UpdatePetDto>({
    mutationFn: (body) => api.pets.update(id!, body),
    onSuccess: (next) => {
      qc.setQueryData(['pet', id], next);
      void qc.invalidateQueries({ queryKey: ['pets'] });
      router.back();
    },
    onError: (e) => Alert.alert('Could not save', e.message),
  });

  const patch = useMutation<Pet, Error, UpdatePetDto>({
    mutationFn: (body) => api.pets.update(id!, body),
    onSuccess: (next) => {
      qc.setQueryData(['pet', id], next);
      void qc.invalidateQueries({ queryKey: ['pets'] });
    },
    onError: (e) => Alert.alert('Save failed', e.message),
  });

  const remove = useMutation<void, Error>({
    mutationFn: () => api.pets.delete(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pets'] });
      router.back();
    },
    onError: (e) => Alert.alert('Could not delete', e.message),
  });

  async function changePhoto(): Promise<void> {
    try {
      setUploading(true);
      const out = await pickAndUploadImage('pet-photo');
      if (out) {
        setPhotoUrl(out.publicUrl);
        // Persist immediately so leaving without Save still keeps the new photo.
        patch.mutate({ photoUrl: out.publicUrl });
      }
    } catch (e) {
      Alert.alert('Upload failed', (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function save(): void {
    if (!name.trim()) {
      Alert.alert('Name is required');
      return;
    }
    const w = weight.trim() ? Number(weight) : null;
    const a = age.trim() ? Number(age) : null;
    if ((w != null && Number.isNaN(w)) || (a != null && Number.isNaN(a))) {
      Alert.alert('Weight and age must be numbers');
      return;
    }
    update.mutate({
      name: name.trim(),
      breed: breed.trim() || null,
      weightKg: w,
      ageYears: a,
      notes: notes.trim() || null,
    });
  }

  function confirmDelete(): void {
    Alert.alert(
      `Delete ${q.data?.name ?? 'this pet'}?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
      ],
    );
  }

  if (q.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  if (q.error || !q.data) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Text style={{ padding: 24, color: '#dc2626' }}>
          {(q.error as Error)?.message ?? 'Not found'}
        </Text>
      </SafeAreaView>
    );
  }

  const busy = update.isPending || remove.isPending;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Pressable
          onPress={changePhoto}
          disabled={uploading}
          style={{
            alignSelf: 'center',
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: '#f1f5f9',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            marginBottom: 20,
          }}
        >
          {uploading ? (
            <ActivityIndicator />
          ) : photoUrl ? (
            <Image source={{ uri: photoUrl }} style={{ width: 140, height: 140 }} />
          ) : (
            <Text style={{ color: '#94a3b8', fontSize: 36 }}>🐾</Text>
          )}
          <View
            style={{
              position: 'absolute',
              bottom: 4,
              backgroundColor: 'rgba(0,0,0,0.55)',
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>
              {photoUrl ? 'Change' : 'Add photo'}
            </Text>
          </View>
        </Pressable>

        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Breed" value={breed} onChangeText={setBreed} />
        <Field
          label="Weight (kg)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
        />
        <Field
          label="Age (years)"
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
        />
        <Field
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <Pressable
          onPress={save}
          disabled={busy}
          style={{
            marginTop: 12,
            backgroundColor: busy ? '#94a3b8' : '#4456f0',
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Text>
        </Pressable>

        <Pressable
          onPress={confirmDelete}
          disabled={busy}
          style={{
            marginTop: 12,
            backgroundColor: '#fee2e2',
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#dc2626', fontWeight: '600', fontSize: 16 }}>
            {remove.isPending ? 'Deleting…' : 'Delete pet'}
          </Text>
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
