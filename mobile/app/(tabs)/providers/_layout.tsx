import { Stack } from 'expo-router';

export default function ProvidersStack(): JSX.Element {
  return (
    <Stack screenOptions={{ headerShown: true, headerTintColor: '#4456f0' }}>
      <Stack.Screen name="index" options={{ title: 'Find a provider' }} />
      <Stack.Screen name="[id]" options={{ title: 'Provider' }} />
    </Stack>
  );
}
