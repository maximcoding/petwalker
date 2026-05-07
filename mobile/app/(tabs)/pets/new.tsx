import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import type { CreatePetDto } from '@petwalker/shared/dto';
import type { Pet } from '@petwalker/shared/types';

export default function NewPet(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const m = useMutation<Pet, Error, CreatePetDto>({
    mutationFn: (body) => api.pets.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pets'] });
      router.back();
    },
    onError: (e) => Alert.alert('Could not save pet', e.message),
  });

  function submit(): void {
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
    m.mutate({
      name: name.trim(),
      species: 'dog',
      breed: breed.trim() || null,
      weightKg: w,
      ageYears: a,
      notes: notes.trim() || null,
      photoUrl,
    });
  }

  async function pickPhoto(): Promise<void> {
    try {
      setUploading(true);
      const out = await pickAndUploadImage('pet-photo');
      if (out) setPhotoUrl(out.publicUrl);
    } catch (e) {
      Alert.alert('Upload failed', (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Pressable
          onPress={pickPhoto}
          disabled={uploading}
          style={{
            alignSelf: 'center',
            width: 120,
            height: 120,
            borderRadius: 60,
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
            <Image source={{ uri: photoUrl }} style={{ width: 120, height: 120 }} />
          ) : (
            <Text style={{ color: '#94a3b8', fontSize: 32 }}>+</Text>
          )}
        </Pressable>

        <Field label="Name" value={name} onChangeText={setName} placeholder="Rex" />
        <Field
          label="Breed"
          value={breed}
          onChangeText={setBreed}
          placeholder="Labrador"
        />
        <Field
          label="Weight (kg)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="22.5"
        />
        <Field
          label="Age (years)"
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          placeholder="4"
        />
        <Field
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
          placeholder="Anything walkers should know"
        />

        <Pressable
          onPress={submit}
          disabled={m.isPending}
          style={{
            marginTop: 12,
            backgroundColor: m.isPending ? '#94a3b8' : '#4456f0',
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
            {m.isPending ? 'Saving…' : 'Save pet'}
          </Text>
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
