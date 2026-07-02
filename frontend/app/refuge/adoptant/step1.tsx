import { useRouteGuard } from '../../../src/components/FeatureGate';
import { RefugeAdoptantStep1 } from '../../../src/screens/RefugeAdoptantStep1';

export default function AdoptantStep1Page() {
  const state = useRouteGuard('refuge');
  if (state === 'hidden') return null;
  return <RefugeAdoptantStep1 />;
}
