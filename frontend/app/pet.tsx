import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useRouteGuard } from '../src/components/FeatureGate';
import { View } from 'react-native';

export default function PetPage() {
  const router = useRouter();
  const state = useRouteGuard('refuge');

  useEffect(() => {
    if (state === 'unlocked') {
      router.replace('/refuge');
    }
  }, [state, router]);

  // Return empty view while loading or if hidden
  return <View />;
}
