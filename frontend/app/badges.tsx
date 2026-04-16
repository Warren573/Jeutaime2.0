import { useRouteGuard } from '../src/components/FeatureGate';
import BadgesScreen from '../src/screens/BadgesScreen';

export default function BadgesPage() {
  const state = useRouteGuard('profiles');
  if (state === 'hidden') return null;
  return <BadgesScreen />;
}
