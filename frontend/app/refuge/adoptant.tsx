import { useRouteGuard } from '../../src/components/FeatureGate';
import { RefugeAdoptantScreen } from '../../src/screens/RefugeAdoptantScreen';

export default function RefugeAdoptantPage() {
  const state = useRouteGuard('refuge');
  if (state === 'hidden') return null;
  return <RefugeAdoptantScreen />;
}
