import { useRouteGuard } from '../../../src/components/FeatureGate';
import { RefugeAdopteStep1 } from '../../../src/screens/RefugeAdopteStep1';

export default function AdopteStep1Page() {
  const state = useRouteGuard('refuge');
  if (state === 'hidden') return null;
  return <RefugeAdopteStep1 />;
}
