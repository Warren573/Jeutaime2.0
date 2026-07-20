import { useRouteGuard } from '../src/components/FeatureGate';
import ReceivedOfferingsScreen from '../src/screens/ReceivedOfferingsScreen';

export default function OfferingsPage() {
  const state = useRouteGuard('offrandes');
  if (state === 'hidden') return null;
  return <ReceivedOfferingsScreen />;
}
