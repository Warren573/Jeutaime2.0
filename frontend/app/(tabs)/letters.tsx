import { useRouteGuard } from '../../src/components/FeatureGate';
import TestCoreLettersScreen from '../../src/screens/TestCoreLettersScreen';

export default function LettersPage() {
  const state = useRouteGuard('letters');
  if (state === 'hidden') return null;
  return <TestCoreLettersScreen />;
}
