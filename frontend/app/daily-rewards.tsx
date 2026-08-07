import { useRouteGuard } from '../src/components/FeatureGate';
import WalletScreen from '../src/screens/WalletScreen';

export default function DailyRewardsPage() {
  const state = useRouteGuard('offrandes');
  if (state === 'hidden') return null;
  return <WalletScreen />;
}
