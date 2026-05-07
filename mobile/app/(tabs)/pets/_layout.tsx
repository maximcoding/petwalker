import { Stack } from 'expo-router';

export default function PetsStack(): JSX.Element {
  return (
    <Stack screenOptions={{ headerShown: true, headerTintColor: '#4456f0' }}>
      <Stack.Screen name="index" options={{ title: 'My pets' }} />
      <Stack.Screen name="new" options={{ title: 'Add pet', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Edit pet' }} />
    </Stack>
  );
}
