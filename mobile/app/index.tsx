import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { getMe } from '@/lib/auth';

export default function IndexRoute(): JSX.Element {
  const [target, setTarget] = useState<'/(auth)/sign-in' | '/(tabs)' | null>(null);

  useEffect(() => {
    void (async () => {
      const me = await getMe();
      setTarget(me ? '/(tabs)' : '/(auth)/sign-in');
    })();
  }, []);

  if (!target) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return <Redirect href={target} />;
}
