import { useRouteGuard } from '../../src/components/FeatureGate';
import TestCoreSalonScreen from '../../src/screens/TestCoreSalonScreen';

export default function SalonPage() {
  const state = useRouteGuard('salons', '/(tabs)/social');
  if (state === 'hidden') return null;
  return <TestCoreSalonScreen />;
}
