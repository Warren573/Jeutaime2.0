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
  Modal,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { createBottle, cancelPendingBottles } from '../api/bottles';

// Fond aquarelle plein écran de l'écran de création.
const SEA_BG = require('../../assets/images/bottle/sea-bg.jpg');

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
// Limite réelle appliquée par le backend : 1 (gratuit) / 5 (premium).
// Le frontend ne bloque pas en amont (pendingBottles inconnu ici) ; il affiche
// simplement le 409 renvoyé + le bouton d'annulation.
const MAX_PENDING_BOTTLES = 5;

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
  const [agePicker, setAgePicker] = useState<'min' | 'max' | null>(null);

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
    <>
      {/* Fond aquarelle épinglé au viewport (fixed sur web), hors du flux —
          n'affecte pas la mise en page. Voile clair pour la lisibilité du form. */}
      <View style={styles.seaBgLayer} pointerEvents="none">
        <Image source={SEA_BG} style={styles.seaBgImage} resizeMode="cover" />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(245,241,232,0.62)' },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
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
              <TouchableOpacity
                style={styles.ageSelect}
                onPress={() => setAgePicker('min')}
              >
                <Text style={styles.ageSelectValue}>{ageMin} ans</Text>
                <Text style={styles.ageSelectChevron}>▾</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.ageStepper}>
              <Text style={styles.ageStepperLabel}>Max</Text>
              <TouchableOpacity
                style={styles.ageSelect}
                onPress={() => setAgePicker('max')}
              >
                <Text style={styles.ageSelectValue}>{ageMax} ans</Text>
                <Text style={styles.ageSelectChevron}>▾</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Message */}
        <View style={styles.section}>
          <Text style={styles.label}>Ton message (max 1000 car)</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Cherche quelqu'une pour..."
            placeholderTextColor="#9C8560"
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

      {/* Menu déroulant d'âge */}
      <Modal
        visible={agePicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAgePicker(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setAgePicker(null)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {agePicker === 'min' ? 'Âge minimum' : 'Âge maximum'}
            </Text>
            <ScrollView style={styles.modalList}>
              {(() => {
                const start = agePicker === 'min' ? 18 : ageMin;
                const end = agePicker === 'min' ? ageMax : 99;
                const items = [];
                for (let a = start; a <= end; a++) items.push(a);
                return items.map(age => {
                  const selected =
                    agePicker === 'min' ? age === ageMin : age === ageMax;
                  return (
                    <TouchableOpacity
                      key={age}
                      style={[
                        styles.modalItem,
                        selected && styles.modalItemSelected,
                      ]}
                      onPress={() => {
                        if (agePicker === 'min') setAgeMin(age);
                        else setAgeMax(age);
                        setAgePicker(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          selected && styles.modalItemTextSelected,
                        ]}
                      >
                        {age} ans
                      </Text>
                    </TouchableOpacity>
                  );
                });
              })()}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    // Au-dessus de la couche de fond fixe.
    position: 'relative',
    zIndex: 1,
  },
  // Couche de fond épinglée au viewport : `fixed` sur web (hors flux), `absolute`
  // plein écran sur natif.
  seaBgLayer:
    Platform.OS === 'web'
      ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 } as any)
      : { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  seaBgImage: {
    width: '100%',
    height: '100%',
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
    gap: 6,
  },
  ageStepperLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  ageSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ageSelectValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  ageSelectChevron: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    maxHeight: '70%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalList: {
    flexGrow: 0,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalItemSelected: {
    backgroundColor: COLORS.accent,
  },
  modalItemText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
  },
  modalItemTextSelected: {
    color: COLORS.card,
    fontWeight: '700',
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
    minHeight: 150,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 6,
    // Parchemin vieilli : papier crème chaud, bordure ambrée, texte « encre ».
    backgroundColor: '#F3E7C6',
    borderWidth: 2,
    borderColor: '#C8A25A',
    fontSize: 16,
    lineHeight: 24,
    color: '#4A3A28',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    // Léger relief pour l'effet papier posé.
    shadowColor: '#3B2C18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
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
