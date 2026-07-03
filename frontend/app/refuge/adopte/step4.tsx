import { useRouteGuard } from '../../../src/components/FeatureGate';
import { RefugeAdopteStep4 } from '../../../src/screens/RefugeAdopteStep4';

export default function AdopteStep4Page() {
  const state = useRouteGuard('refuge');
  if (state === 'hidden') return null;
  return <RefugeAdopteStep4 />;
}
