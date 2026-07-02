import { useRouteGuard } from '../../../src/components/FeatureGate';
import { RefugeAdopteStep2 } from '../../../src/screens/RefugeAdopteStep2';

export default function AdopteStep2Page() {
  const state = useRouteGuard('refuge');
  if (state === 'hidden') return null;
  return <RefugeAdopteStep2 />;
}
