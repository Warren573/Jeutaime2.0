import { useRouteGuard } from '../../../src/components/FeatureGate';
import { RefugeAdoptantStep3 } from '../../../src/screens/RefugeAdoptantStep3';

export default function AdoptantStep3Page() {
  const state = useRouteGuard('refuge');
  if (state === 'hidden') return null;
  return <RefugeAdoptantStep3 />;
}
