import { useRouteGuard } from '../src/components/FeatureGate';
import PlaceholderScreen from '../src/screens/PlaceholderScreen';

export default function ShopPage() {
  const state = useRouteGuard('offrandes');
  if (state === 'hidden') return null;
  return <PlaceholderScreen icon="🛒" title="Boutique" description="Achetez des pièces, avatars et accessoires." />;
}
