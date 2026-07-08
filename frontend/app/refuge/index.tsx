import { useRouteGuard } from '../../src/components/FeatureGate';
import { RefugeMainScreen } from '../../src/screens/RefugeMainScreen';

export default function RefugePage() {
  const state = useRouteGuard('refuge');
  console.log('[REFUGE ROUTE GUARD]', state);
  if (state === 'hidden') return null;
  return <RefugeMainScreen />;
}
