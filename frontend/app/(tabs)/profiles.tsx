import { useRouteGuard } from '../../src/components/FeatureGate';
import ProfilesScreen from '../../src/screens/ProfilesScreen';

export default function ProfilesPage() {
  const state = useRouteGuard('profiles');
  if (state === 'hidden') return null;
  return <ProfilesScreen />;
}
