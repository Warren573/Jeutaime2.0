import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { createBottle } from '../api/bottles';

const COLORS = {
  bg: '#F5F1E8',
  card: '#FFFFFF',
  text: '#2B2B2B',
  textSecondary: '#6B6B6B',
  border: '#D8D2C4',
  accent: '#8B2E3C',
  accentLight: '#E8CFCF',
};

export default function BottleCreationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(s => s.currentUser);

  const [targetGender, setTargetGender] = useState<'HOMME' | 'FEMME'>('FEMME');
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(35);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingBottles, setPendingBottles] = useState(0);
  const [debugStage, setDebugStage] = useState('');
  const [debugMessage, setDebugMessage] = useState('');
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [backendInfo, setBackendInfo] = useState<any>(null);

  const FRONTEND_BUILD_SHA = 'fa46a8b4';
  const FRONTEND_BUILD_TIME = new Date().toISOString();

  useEffect(() => {
    // Fetch backend version info
    const fetchBackendInfo = async () => {
      try {
        const res = await fetch(process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') + '/api/health' || 'https://jeutaime-staging.onrender.com/api/health');
        if (res.ok) {
          const data = await res.json();
          setBackendInfo({
            sha: data.buildSha || 'unknown',
            buildTime: data.buildTime || 'unknown',
            instrumentation: data.instrumentation || 'unknown',
          });
        }
      } catch (e) {
        console.log('[HEALTH] Failed to fetch backend info');
      }
    };
    fetchBackendInfo();
  }, []);

  useEffect(() => {
    // TODO: Load pending bottle count from API
    // For now, assume 0
    setPendingBottles(0);
  }, []);

  const addLog = (step: string, value: string) => {
    const logEntry = `${step} — ${value}`;
    setExecutionLog(prev => [...prev, logEntry]);
    console.log(logEntry);
  };

  const handleSend = async () => {
    setExecutionLog([]);

    addLog('A', `BOUTON PRESSÉ | id=${currentUser?.id?.substring(0,8)} city=${currentUser?.city} msg_len=${message.length}`);
    setDebugStage('A');
    setDebugMessage('Clic reçu');

    addLog('B', `handleSend entrée | isLoading=${isLoading} disabled=${!message.trim() || isLoading || pendingBottles >= 3}`);
    setDebugStage('B');
    setDebugMessage('Entrée dans handleSend');

    if (!message.trim()) {
      addLog('C1', `❌ BLOQUÉ - message vide (length=${message.length})`);
      setDebugStage('C1');
      setDebugMessage('❌ Message vide');
      Alert.alert('Erreur', 'Écris un message');
      return;
    }
    addLog('C1', `PASSÉ - message validé (length=${message.length})`);
    setDebugStage('C1');
    setDebugMessage('✓ Message validé');

    if (message.length > 1000) {
      addLog('C2', `❌ BLOQUÉ - message trop long (${message.length}/1000)`);
      setDebugStage('C2');
      setDebugMessage(`❌ Message trop long (${message.length}/1000)`);
      Alert.alert('Erreur', `Maximum 1000 caractères (tu as ${message.length})`);
      return;
    }
    addLog('C2', `PASSÉ - longueur OK (${message.length} ≤ 1000)`);
    setDebugStage('C2');
    setDebugMessage('✓ Longueur validée');

    if (pendingBottles >= 3) {
      addLog('C3', `❌ BLOQUÉ - ${pendingBottles} bouteilles pending (max 3)`);
      setDebugStage('C3');
      setDebugMessage(`❌ ${pendingBottles} bouteilles en attente (max 3)`);
      Alert.alert(
        'Erreur',
        'Maximum 3 bouteilles en attente. Attends qu\'une soit acceptée/refusée'
      );
      return;
    }
    addLog('C3', `PASSÉ - limite OK (pending=${pendingBottles} < 3)`);
    setDebugStage('C3');
    setDebugMessage('✓ Limite de bouteilles OK');

    if (!currentUser?.city) {
      addLog('C4', `❌ BLOQUÉ - pas de ville (currentUser?.city=${currentUser?.city})`);
      setDebugStage('C4');
      setDebugMessage('❌ Pas de ville dans le profil');
      Alert.alert(
        'Erreur',
        'Complète ta ville dans Profil avant d\'envoyer une bouteille'
      );
      return;
    }
    addLog('C4', `PASSÉ - ville OK (city=${currentUser?.city})`);
    setDebugStage('C4');
    setDebugMessage('✓ Ville validée');

    const payload = { message: message.trim(), targetGender, ageMin, ageMax };
    addLog('D', `TOUS VALIDATIONS PASSÉES - payload ready | ${JSON.stringify(payload)}`);
    setDebugStage('D');
    setDebugMessage('Appel API lancé');

    setIsLoading(true);
    addLog('D', `loading=true, calling createBottle()`);

    try {
      addLog('E', `createBottle() START`);
      setDebugStage('E');

      const result = await createBottle(payload);

      addLog('E', `createBottle() SUCCESS | id=${result.id} status=${result.status}`);
      setDebugStage('E');
      setDebugMessage('✓ Création réussie');

      addLog('J', `NAVIGATION ROUTER.BACK() START`);
      Alert.alert('Succès', 'Bouteille lancée à la mer! ✓');
      router.back();
      addLog('K', `NAVIGATION ROUTER.BACK() SUCCESS`);

    } catch (error: any) {
      const errorMsg = error?.message || String(error) || 'Erreur inconnue';
      const errorStatus = error?.status || 'N/A';
      const errorCode = error?.code || 'N/A';
      addLog('ERREUR', `${errorStatus} | code=${errorCode} | msg=${errorMsg}`);

      setDebugStage('ERREUR');
      let displayMessage = 'Erreur d\'envoi. Réessaie.';

      if (error?.message) {
        displayMessage = error.message;
      }

      if ((error as any).status) {
        const status = (error as any).status;
        if (status === 400) {
          displayMessage = `Paramètres invalides: ${error.message}`;
        } else if (status === 401) {
          displayMessage = 'Session expirée. Reconnecte-toi.';
        } else if (status === 403) {
          displayMessage = 'Accès refusé.';
        } else if (status >= 500) {
          displayMessage = 'Erreur serveur. Réessaie plus tard.';
        }
      }

      setDebugMessage(`❌ ${displayMessage}`);
      Alert.alert('Erreur', displayMessage);

    } finally {
      addLog('G', `FINALLY - loading=false`);
      setDebugStage('G');
      setDebugMessage('Fin du traitement');
      setIsLoading(false);
    }
  };

  const charCount = message.length;
  const charRemaining = 1000 - charCount;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: COLORS.bg }]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.headerBack}>← Retour</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.headerCancel}>Annuler</Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title}>Bouteille à la mer</Text>

        {/* Gender Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Qui cherches-tu?</Text>
          <View style={styles.genderRow}>
            {(['HOMME', 'FEMME'] as const).map(gender => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.genderBtn,
                  targetGender === gender && styles.genderBtnActive,
                ]}
                onPress={() => setTargetGender(gender)}
              >
                <Text
                  style={[
                    styles.genderBtnText,
                    targetGender === gender && styles.genderBtnTextActive,
                  ]}
                >
                  {gender === 'HOMME' ? '👨 Homme' : '👩 Femme'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Age Range */}
        <View style={styles.section}>
          <Text style={styles.label}>Âge</Text>
          <View style={styles.ageRow}>
            <View style={styles.ageInput}>
              <Text style={styles.ageLabel}>Min:</Text>
              <TextInput
                style={styles.ageField}
                keyboardType="numeric"
                value={String(ageMin)}
                onChangeText={text => {
                  const num = parseInt(text) || 18;
                  setAgeMin(Math.max(18, Math.min(num, ageMax)));
                }}
              />
            </View>
            <View style={styles.ageInput}>
              <Text style={styles.ageLabel}>Max:</Text>
              <TextInput
                style={styles.ageField}
                keyboardType="numeric"
                value={String(ageMax)}
                onChangeText={text => {
                  const num = parseInt(text) || 99;
                  setAgeMax(Math.min(99, Math.max(num, ageMin)));
                }}
              />
            </View>
          </View>
        </View>

        {/* Message */}
        <View style={styles.section}>
          <Text style={styles.label}>Ton message (max 1000 car)</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Cherche quelqu'une pour..."
            placeholderTextColor={COLORS.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text
            style={[
              styles.charCount,
              charRemaining < 100 && styles.charCountWarning,
            ]}
          >
            {charRemaining} caractères restants
          </Text>
        </View>

        {/* Pending Warning */}
        {pendingBottles > 0 && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Tu as déjà {pendingBottles} bouteille{pendingBottles > 1 ? 's' : ''} en attente. Max 3.
            </Text>
          </View>
        )}

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!message.trim() || isLoading || pendingBottles >= 3) &&
              styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!message.trim() || isLoading || pendingBottles >= 3}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.card} />
          ) : (
            <Text style={styles.sendBtnText}>Envoyer la bouteille à la mer</Text>
          )}
        </TouchableOpacity>

        {/* Build Info */}
        <View style={styles.buildInfoPanel}>
          <Text style={styles.buildInfoLabel}>BUILD INFO</Text>
          <Text style={styles.buildInfoText}>FRONTEND_SHA={FRONTEND_BUILD_SHA}</Text>
          <Text style={styles.buildInfoText}>BACKEND_SHA={backendInfo?.sha || 'loading...'}</Text>
          <Text style={styles.buildInfoText}>API_URL={process.env.EXPO_PUBLIC_API_URL}</Text>
          <Text style={styles.buildInfoText}>INSTRUMENTATION={backendInfo?.instrumentation || 'unknown'}</Text>
          <Text style={styles.buildInfoLabel} style={{marginTop: 8}}>BUTTON STATE</Text>
          <Text style={styles.buildInfoText}>message.trim().length={message.trim().length}</Text>
          <Text style={styles.buildInfoText}>isLoading={String(isLoading)}</Text>
          <Text style={styles.buildInfoText}>pendingBottles={pendingBottles}</Text>
          <Text style={styles.buildInfoText}>disabled={String(!message.trim() || isLoading || pendingBottles >= 3)}</Text>
        </View>

        {/* Debug Panel */}
        {(debugStage || executionLog.length > 0) && (
          <View style={styles.debugPanel}>
            <Text style={styles.debugLabel}>🔍 DIAGNOSTIC EXÉCUTION</Text>
            <Text style={styles.debugStage}>État: {debugStage || 'Attente'}</Text>
            <Text style={styles.debugMessage}>{debugMessage}</Text>
            {executionLog.length > 0 && (
              <View style={styles.logContainer}>
                <Text style={styles.logTitle}>Historique:</Text>
                {executionLog.map((log, idx) => (
                  <Text key={idx} style={styles.logLine}>{log}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerBack: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  headerCancel: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  genderBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  genderBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  genderBtnTextActive: {
    color: COLORS.card,
  },
  ageRow: {
    flexDirection: 'row',
    gap: 16,
  },
  ageInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  ageField: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    color: COLORS.text,
  },
  messageInput: {
    minHeight: 120,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  charCountWarning: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  warningBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: COLORS.accentLight,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
  },
  sendBtn: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    marginTop: 16,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.card,
    textAlign: 'center',
  },
  buildInfoPanel: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  buildInfoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  buildInfoText: {
    fontSize: 9,
    color: '#1B5E20',
    fontFamily: 'Courier',
    lineHeight: 12,
    marginBottom: 2,
  },
  debugPanel: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  debugLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  debugStage: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
    marginBottom: 4,
  },
  debugMessage: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  logContainer: {
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#CCC',
    maxHeight: 300,
  },
  logTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  logLine: {
    fontSize: 9,
    color: '#555',
    fontFamily: 'Courier',
    lineHeight: 14,
    marginBottom: 2,
  },
});
