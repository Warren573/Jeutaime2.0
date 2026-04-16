import { useRouteGuard } from '../src/components/FeatureGate';
import MiniGamesScreen from '../src/screens/MiniGamesScreen';

export default function GamesPage() {
  const state = useRouteGuard('games');
  if (state === 'hidden') return null;
  return <MiniGamesScreen />;
}
