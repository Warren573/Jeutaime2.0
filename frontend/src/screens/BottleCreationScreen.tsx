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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { createBottle, cancelPendingBottles } from '../api/bottles';

const COLORS = {
  bg: '#F5F1E8',
  card: '#FFFFFF',
  text: '#2B2B2B',
  textSecondary: '#6B6B6B',
  border: '#D8D2C4',
  accent: '#8B2E3C',
  accentLight: '#E8CFCF',
};

const MAX_MESSAGE_LENGTH = 1000;
const MAX_PENDING_BOTTLES = 3;

export default function BottleCreationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(s => s.currentUser);

  const [targetGender, setTargetGender] = useState<
    'HOMME' | 'FEMME' | 'LES_DEUX'
  >('FEMME');
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(35);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingBottles, setPendingBottles] = useState(0);
  // Feedback affiché DANS l'écran. Indispensable : Alert.alert() de
  // react-native-web est un no-op sur le Web, donc toute alerte y est invisible.
  const [feedback, setFeedback] = useState<
    { type: 'error' | 'success'; text: string } | null
  >(null);
  const [atLimit, setAtLimit] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    // TODO: charger le nombre réel de bouteilles en attente depuis l'API.
    setPendingBottles(0);
  }, []);

  const isDisabled =
    !message.trim() || isLoading || pendingBottles >= MAX_PENDING_BOTTLES;

  const handleCancelPending = async () => {
    setIsCancelling(true);
    setFeedback(null);
    try {
      const cancelled = await cancelPendingBottles();
      setAtLimit(false);
      setFeedback({
        type: 'success',
        text: `${cancelled} bouteille(s) en attente annulée(s). Tu peux renvoyer une bouteille.`,
      });
    } catch (error: any) {
      const status = error?.status;
      const msg = (error?.message || 'Réessaie.').toString();
      setFeedback({
        type: 'error',
        text: `[${status ?? '?'}] Impossible d'annuler : ${msg}`,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSend = async () => {
    setFeedback(null);
    setAtLimit(false);

    if (!message.trim()) {
      setFeedback({ type: 'error', text: 'Écris un message.' });
      return;
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      setFeedback({
        type: 'error',
        text: `Maximum ${MAX_MESSAGE_LENGTH} caractères (tu as ${message.length}).`,
      });
      return;
    }
    if (pendingBottles >= MAX_PENDING_BOTTLES) {
      setFeedback({
        type: 'error',
        text: "Maximum 3 bouteilles en attente. Attends qu'une soit acceptée ou refusée.",
      });
      return;
    }
    if (!currentUser?.city) {
      setFeedback({
        type: 'error',
        text: "Complète ta ville dans ton profil avant d'envoyer une bouteille.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await createBottle({
        message: message.trim(),
        targetGender,
        ageMin,
        ageMax,
      });
      setFeedback({ type: 'success', text: 'Bouteille lancée à la mer ! ✓' });
      // Laisse le temps de voir la confirmation avant de revenir en arrière.
      setTimeout(() => router.back(), 1200);
    } catch (error: any) {
      // On affiche TOUJOURS le message réel renvoyé par le backend — ne jamais
      // le masquer derrière un texte générique, sinon la vraie cause est perdue.
      const status = error?.status;
      const backendMsg =
        typeof error?.message === 'string' && error.message.trim()
          ? error.message.trim()
          : '';
      let displayMessage = backendMsg || "Erreur d'envoi. Réessaie.";

      if (status === 401) {
        displayMessage = 'Session expirée. Reconnecte-toi.';
      } else if (typeof status === 'number') {
        // Préfixe le code HTTP pour le diagnostic, en gardant le message réel.
        displayMessage = `[${status}] ${displayMessage}`;
      }
      // 409 = quota de bouteilles en attente atteint → proposer l'annulation.
      setAtLimit(status === 409);
      setFeedback({ type: 'error', text: displayMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const charRemaining = MAX_MESSAGE_LENGTH - message.length;

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
        keyboardShouldPersistTaps="handled"
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
            {([
              { value: 'HOMME', label: '👨 Homme' },
              { value: 'FEMME', label: '👩 Femme' },
              { value: 'LES_DEUX', label: '👫 Les deux' },
            ] as const).map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.genderBtn,
                  targetGender === value && styles.genderBtnActive,
                ]}
                onPress={() => setTargetGender(value)}
              >
                <Text
                  style={[
                    styles.genderBtnText,
                    targetGender === value && styles.genderBtnTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Age Range */}
        <View style={styles.section}>
          <Text style={styles.label}>Âge : {ageMin} – {ageMax} ans</Text>
          <View style={styles.ageRow}>
            <View style={styles.ageStepper}>
              <Text style={styles.ageStepperLabel}>Min</Text>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setAgeMin(Math.max(18, ageMin - 1))}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{ageMin}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setAgeMin(Math.min(ageMax, ageMin + 1))}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.ageStepper}>
              <Text style={styles.ageStepperLabel}>Max</Text>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setAgeMax(Math.max(ageMin, ageMax - 1))}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{ageMax}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setAgeMax(Math.min(99, ageMax + 1))}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
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
              ⚠️ Tu as déjà {pendingBottles} bouteille
              {pendingBottles > 1 ? 's' : ''} en attente. Max 3.
            </Text>
          </View>
        )}

        {/* Feedback (visible sur web ET mobile) */}
        {feedback && (
          <View
            style={[
              styles.feedbackBox,
              feedback.type === 'error'
                ? styles.feedbackError
                : styles.feedbackSuccess,
            ]}
          >
            <Text
              style={[
                styles.feedbackText,
                feedback.type === 'error'
                  ? styles.feedbackTextError
                  : styles.feedbackTextSuccess,
              ]}
            >
              {feedback.text}
            </Text>
          </View>
        )}

        {/* Bouton d'annulation — apparaît quand le quota (max 3) est atteint */}
        {atLimit && (
          <TouchableOpacity
            style={[styles.cancelBtn, isCancelling && styles.sendBtnDisabled]}
            onPress={handleCancelPending}
            disabled={isCancelling}
            accessibilityRole="button"
            accessibilityLabel="Annuler mes bouteilles en attente"
          >
            {isCancelling ? (
              <ActivityIndicator color={COLORS.accent} />
            ) : (
              <Text style={styles.cancelBtnText}>
                Annuler mes bouteilles en attente
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendBtn, isDisabled && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityLabel="Envoyer la bouteille à la mer"
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.card} />
          ) : (
            <Text style={styles.sendBtnText}>Envoyer la bouteille à la mer</Text>
          )}
        </TouchableOpacity>
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
  ageStepper: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  ageStepperLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.accent,
    lineHeight: 26,
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 34,
    textAlign: 'center',
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
  feedbackBox: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  feedbackError: {
    backgroundColor: '#FDECEA',
    borderColor: '#E5534B',
  },
  feedbackSuccess: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  feedbackTextError: {
    color: '#B3261E',
  },
  feedbackTextSuccess: {
    color: '#2E7D32',
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
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.accent,
    marginTop: 12,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accent,
    textAlign: 'center',
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.card,
    textAlign: 'center',
  },
});
