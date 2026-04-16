import { useRouteGuard } from '../../src/components/FeatureGate';
import JournalScreen from '../../src/screens/JournalScreen';

export default function JournalPage() {
  const state = useRouteGuard('journal');
  if (state === 'hidden') return null; // redirection en cours
  return <JournalScreen />;
}
