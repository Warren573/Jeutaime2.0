import { useRouteGuard } from '../src/components/FeatureGate';
import SoundsSettingsScreen from '../src/screens/SoundsSettingsScreen';

export default function SoundsPage() {
  const state = useRouteGuard('magie');
  if (state === 'hidden') return null;
  return <SoundsSettingsScreen />;
}
