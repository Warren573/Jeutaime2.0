import { useRouteGuard } from '../src/components/FeatureGate';
import PlaceholderScreen from '../src/screens/PlaceholderScreen';

export default function CoinsPage() {
  const state = useRouteGuard('offrandes');
  if (state === 'hidden') return null;
  return <PlaceholderScreen icon="💰" title="Mes pièces" description="Consultez votre solde et gérez vos pièces." />;
}
