import { useRouteGuard } from '../src/components/FeatureGate';
import PlaceholderScreen from '../src/screens/PlaceholderScreen';

export default function OfferingsPage() {
  const state = useRouteGuard('offrandes');
  if (state === 'hidden') return null;
  return <PlaceholderScreen icon="✨" title="Offrandes et magie" description="Découvrez les offrandes et effets magiques." />;
}
