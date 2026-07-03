import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function PetPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/refuge');
  }, [router]);
  return null;
}
