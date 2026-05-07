import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

import { Field } from '@/components/Field';
import { confirmSignUp } from '@/lib/auth';

export default function Confirm(): JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(): Promise<void> {
    setErr(null);
    setBusy(true);
    try {
      await confirmSignUp(email, code);
      router.replace('/(auth)/sign-in');
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
      <Text style={{ fontSize: 28, fontWeight: '600', marginBottom: 8 }}>Confirm email</Text>
      <Text style={{ marginBottom: 24, color: '#64748b' }}>
        Enter the 6-digit code we emailed you.
      </Text>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" />
      {err ? <Text style={{ color: '#dc2626', marginBottom: 12 }}>{err}</Text> : null}
      <Pressable
        onPress={onSubmit}
        disabled={busy}
        style={{
          backgroundColor: busy ? '#94a3b8' : '#4456f0',
          borderRadius: 10,
          padding: 14,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
          {busy ? 'Confirming…' : 'Confirm'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
