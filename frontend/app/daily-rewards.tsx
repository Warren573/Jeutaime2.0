import { useRouteGuard } from '../src/components/FeatureGate';
import PlaceholderScreen from '../src/screens/PlaceholderScreen';

export default function DailyRewardsPage() {
  const state = useRouteGuard('offrandes');
  if (state === 'hidden') return null;
  return <PlaceholderScreen icon="🎁" title="Récompenses quotidiennes" description="Connectez-vous chaque jour pour gagner des pièces." />;
}
