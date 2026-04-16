import { useRouteGuard } from '../../src/components/FeatureGate';
import SalonScreen from '../../src/screens/SalonScreen';

export default function SalonPage() {
  const state = useRouteGuard('salons', '/(tabs)/social');
  if (state === 'hidden') return null;
  return <SalonScreen />;
}
