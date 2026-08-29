import { useRouteGuard } from '../../src/components/FeatureGate';
import LettersScreen from '../../src/screens/LettersScreen';

export default function LettersPage() {
  const state = useRouteGuard('letters');
  if (state === 'hidden') return null;
  return <LettersScreen />;
}
