import { useRouteGuard } from '../src/components/FeatureGate';
import PlaceholderScreen from '../src/screens/PlaceholderScreen';

export default function SoundsPage() {
  const state = useRouteGuard('magie');
  if (state === 'hidden') return null;
  return <PlaceholderScreen icon="🔊" title="Sons et vibrations" description="Personnalisez les sons et retours haptiques." />;
}
