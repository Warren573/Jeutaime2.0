import { useRouteGuard } from '../../../src/components/FeatureGate';
import { RefugeAdoptantStep2 } from '../../../src/screens/RefugeAdoptantStep2';

export default function AdoptantStep2Page() {
  const state = useRouteGuard('refuge');
  if (state === 'hidden') return null;
  return <RefugeAdoptantStep2 />;
}
