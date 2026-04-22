import { useRouteGuard } from '../src/components/FeatureGate';
import BackgroundPickerScreen from '../src/screens/BackgroundPickerScreen';

export default function BackgroundPickerPage() {
  const state = useRouteGuard('magie');
  if (state === 'hidden') return null;
  return <BackgroundPickerScreen />;
}
