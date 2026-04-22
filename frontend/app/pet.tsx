import { useRouteGuard } from '../src/components/FeatureGate';
import PetScreen from '../src/screens/PetScreen';

export default function PetPage() {
  const state = useRouteGuard('refuge');
  if (state === 'hidden') return null; // redirection en cours
  return <PetScreen />;
}
