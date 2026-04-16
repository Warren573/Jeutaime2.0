import { useRouteGuard } from '../src/components/FeatureGate';
import PlaceholderScreen from '../src/screens/PlaceholderScreen';

export default function SouvenirsPage() {
  const state = useRouteGuard('souvenirs');
  if (state === 'hidden') return null;
  return <PlaceholderScreen icon="🎁" title="Boîte à souvenirs" description="Retrouvez vos moments et jalons importants." />;
}
