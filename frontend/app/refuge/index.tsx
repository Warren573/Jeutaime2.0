import { useRouteGuard } from '../../src/components/FeatureGate';
import { RefugeSessionScreen } from '../../src/screens/RefugeSessionScreen';

export default function RefugePage() {
  const state = useRouteGuard('refuge');
  if (state === 'hidden') return null;
  return <RefugeSessionScreen />;
}
