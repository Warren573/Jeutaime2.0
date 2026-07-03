import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useRouteGuard } from '../src/components/FeatureGate';

export default function PetPage() {
  const router = useRouter();
  const state = useRouteGuard('refuge');

  useEffect(() => {
    if (state !== 'loading') {
      router.replace('/refuge');
    }
  }, [state, router]);

  return null;
}
