import { useRouteGuard } from '../../../src/components/FeatureGate';
import { RefugeAdopteStep3 } from '../../../src/screens/RefugeAdopteStep3';

export default function AdopteStep3Page() {
  const state = useRouteGuard('refuge');
  if (state === 'hidden') return null;
  return <RefugeAdopteStep3 />;
}
