import { useRouteGuard } from '../src/components/FeatureGate';
import { AvatarEditorScreen } from '../src/screens/AvatarEditorScreen';

export default function AvatarBuilderPage() {
  const state = useRouteGuard('magie');
  if (state === 'hidden') return null;
  return <AvatarEditorScreen />;
}
