import { useRouteGuard } from '../src/components/FeatureGate';
import ShopScreen from '../src/screens/ShopScreen';

export default function ShopPage() {
  const state = useRouteGuard('offrandes');
  if (state === 'hidden') return null;
  return <ShopScreen />;
}
