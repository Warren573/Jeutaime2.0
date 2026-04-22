import { useRouteGuard } from '../../src/components/FeatureGate';
import DuelPlayScreen from '../../src/screens/DuelPlayScreen';

export default function DuelPlayPage() {
  const state = useRouteGuard('games');
  if (state === 'hidden') return null;
  return <DuelPlayScreen />;
}
