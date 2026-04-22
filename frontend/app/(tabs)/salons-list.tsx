import { useRouteGuard } from '../../src/components/FeatureGate';
import SalonsListScreen from '../../src/screens/SalonsListScreen';

export default function SalonsListPage() {
  const state = useRouteGuard('salons');
  if (state === 'hidden') return null;
  return <SalonsListScreen />;
}
