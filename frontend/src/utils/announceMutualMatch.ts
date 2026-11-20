import { Alert, Platform } from 'react-native';

export function announceMutualMatch(openQuestions: () => void) {
  const title = 'C’est un match !';
  const message = 'Vous vous êtes envoyé un Smile. Répondez aux 3 questions pour débloquer les lettres.';
  const action = 'Jouer aux 3 questions';

  if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
    if (globalThis.confirm(`${title}\n\n${message}\n\n${action} ?`)) {
      openQuestions();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Plus tard', style: 'cancel' },
    { text: action, onPress: openQuestions },
  ]);
}
