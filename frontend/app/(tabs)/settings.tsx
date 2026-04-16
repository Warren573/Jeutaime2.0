import { useRouteGuard } from '../../src/components/FeatureGate';
import SettingsScreen from '../../src/screens/SettingsScreen';

export default function SettingsPage() {
  const state = useRouteGuard('settings');
  if (state === 'hidden') return null;
  return <SettingsScreen />;
}
