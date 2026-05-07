import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Field } from '@/components/Field';
import { signIn } from '@/lib/auth';

export default function SignIn(): JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(): Promise<void> {
    setErr(null);
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
      <Text style={{ fontSize: 28, fontWeight: '600', marginBottom: 24 }}>Sign in</Text>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
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
          {busy ? 'Signing in…' : 'Sign in'}
        </Text>
      </Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
        <Text>No account? </Text>
        <Link href="/(auth)/sign-up" style={{ color: '#4456f0', fontWeight: '600' }}>
          Create one
        </Link>
      </View>
    </ScrollView>
  );
}
