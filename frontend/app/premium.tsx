import { useRouteGuard } from '../src/components/FeatureGate';
import PlaceholderScreen from '../src/screens/PlaceholderScreen';

export default function PremiumPage() {
  const state = useRouteGuard('premium');
  if (state === 'hidden') return null;
  return <PlaceholderScreen icon="👑" title="Premium" description="Débloquez toutes les fonctionnalités JeuTaime." />;
}
