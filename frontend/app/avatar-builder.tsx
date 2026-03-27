import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AvatarEditorScreen } from '../src/screens/AvatarEditorScreen';

// ─── Error boundary ───────────────────────────────────────────────────────────
// Affiche l'erreur exacte à la place d'une page blanche.
// À supprimer une fois l'erreur identifiée et corrigée.

interface EBState { error: string | null; stack: string | null }

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  EBState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null, stack: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error: error.message, stack: info.componentStack ?? null });
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, padding: 20, backgroundColor: '#fff' }}>
          <Text style={{ color: 'red', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
            ❌ ERREUR AVATAR EDITOR
          </Text>
          <Text style={{ color: '#333', fontSize: 13, marginBottom: 16 }}>
            {this.state.error}
          </Text>
          <Text style={{ color: '#666', fontSize: 11, fontFamily: 'monospace' }}>
            {this.state.stack ?? '(pas de stack)'}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export default function AvatarBuilderRoute() {
  return (
    <ErrorBoundary>
      <AvatarEditorScreen />
    </ErrorBoundary>
  );
}
