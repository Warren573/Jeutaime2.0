import { useRouteGuard } from '../src/components/FeatureGate';
import WeeklyProfileScreen from '../src/screens/WeeklyProfileScreen';

export default function WeeklyProfilePage() {
  const state = useRouteGuard('profiles');
  if (state === 'hidden') return null;
  return <WeeklyProfileScreen />;
}
