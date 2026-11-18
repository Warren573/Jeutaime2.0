/** Ancienne page « Mon journal de bord » retirée définitivement.
 * Les anciens liens ouvrent désormais la correspondance, sans afficher ce pseudo-profil.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';
import { isSafeId } from '../src/utils/pushNavigation';

export default function LegacyMatchProfileRedirect() {
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  return <Redirect href={isSafeId(matchId) ? `/(tabs)/letters?matchId=${matchId}` : '/(tabs)/letters'} />;
}
