import { useRouteGuard } from '../src/components/FeatureGate';
import { RefugeHomeScreen } from '../src/screens/RefugeHomeScreen';

export default function RefugePage() {
  const state = useRouteGuard('refuge');
  if (state === 'hidden') return null;
  return <RefugeHomeScreen />;
}
