import { useRouteGuard } from '../../src/components/FeatureGate';
import { RefugeAdopteScreen } from '../../src/screens/RefugeAdopteScreen';

export default function RefugeAdoptePage() {
  const state = useRouteGuard('refuge');
  if (state === 'hidden') return null;
  return <RefugeAdopteScreen />;
}
