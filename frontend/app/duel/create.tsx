import { useRouteGuard } from '../../src/components/FeatureGate';
import DuelCreateScreen from '../../src/screens/DuelCreateScreen';

export default function DuelCreatePage() {
  const state = useRouteGuard('games');
  if (state === 'hidden') return null;
  return <DuelCreateScreen />;
}
