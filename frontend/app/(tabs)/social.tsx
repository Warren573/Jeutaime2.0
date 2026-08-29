import { useRouteGuard } from '../../src/components/FeatureGate';
import SocialScreen from '../../src/screens/SocialScreen';

export default function SocialPage() {
  const state = useRouteGuard('social');
  if (state === 'hidden') return null;
  return <SocialScreen />;
}
