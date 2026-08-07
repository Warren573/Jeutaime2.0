import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackButton } from '../components/AppBackButton';
import {
  createSupportTicket,
  listMySupportTickets,
  type SupportTicketDTO,
  type SupportTicketKind,
} from '../api/support';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../theme/appTheme';

const STATUS_LABEL: Record<SupportTicketDTO['status'], string> = {
  OPEN: 'Ouvert',
  REVIEWING: 'En cours',
  CLOSED: 'Fermé',
};

export default function SupportTicketScreen({ mode }: { mode: 'bug' | 'support' }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const kind: SupportTicketKind = mode === 'bug' ? 'BUG' : 'SUPPORT';
  const title = mode === 'bug' ? 'Signaler un bug' : 'Contacter le support';
  const subtitle = mode === 'bug'
    ? 'Décris ce qui ne fonctionne pas pour que le problème puisse être reproduit.'
    : 'Explique ta demande le plus clairement possible.';

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [tickets, setTickets] = useState<SupportTicketDTO[]>([]);

  const canSubmit = subject.trim().length >= 3 && message.trim().length >= 10 && !submitting;

  const loadTickets = useCallback(async () => {
    try {
      setLoadingTickets(true);
      setTickets(await listMySupportTickets());
    } catch {
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const visibleTickets = useMemo(
    () => tickets.filter((ticket) => ticket.kind === kind).slice(0, 10),
    [kind, tickets],
  );

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const ticket = await createSupportTicket({
        kind,
        subject: subject.trim(),
        message: message.trim(),
      });
      setSubject('');
      setMessage('');
      setTickets((prev) => [ticket, ...prev]);
      Alert.alert(
        'Message envoyé',
        `Ton ticket a bien été enregistré. Référence : ${ticket.id}`,
      );
    } catch (err) {
      Alert.alert(
        'Envoi impossible',
        err instanceof Error ? err.message : 'Une erreur est survenue.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>{mode === 'bug' ? 'AIDE TECHNIQUE' : 'SUPPORT'}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Sujet</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder={mode === 'bug' ? 'Ex. Impossible d’ouvrir le Refuge' : 'Ex. Question sur mon compte'}
            placeholderTextColor={APP_COLORS.muted}
            maxLength={120}
            style={styles.input}
            editable={!submitting}
          />

          <Text style={[styles.label, styles.messageLabel]}>Message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={mode === 'bug'
              ? 'Ce que tu faisais, ce qui s’est passé, et ce que tu attendais…'
              : 'Décris ta demande…'}
            placeholderTextColor={APP_COLORS.muted}
            multiline
            maxLength={4000}
            textAlignVertical="top"
            style={[styles.input, styles.messageInput]}
            editable={!submitting}
          />
          <Text style={styles.counter}>{message.length} / 4000</Text>

          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={() => void submit()}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitText}>Envoyer</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>MES DERNIERS TICKETS</Text>
          <TouchableOpacity onPress={() => void loadTickets()} disabled={loadingTickets}>
            <Text style={styles.refreshText}>Actualiser</Text>
          </TouchableOpacity>
        </View>

        {loadingTickets ? (
          <ActivityIndicator color={APP_COLORS.burgundy} style={styles.loader} />
        ) : visibleTickets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucun ticket {mode === 'bug' ? 'de bug' : 'de support'} pour le moment.</Text>
          </View>
        ) : (
          visibleTickets.map((ticket) => (
            <View style={styles.ticketCard} key={ticket.id}>
              <View style={styles.ticketTop}>
                <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                <Text style={styles.ticketStatus}>{STATUS_LABEL[ticket.status]}</Text>
              </View>
              <Text style={styles.ticketDate}>
                {new Date(ticket.createdAt).toLocaleString('fr-FR')}
              </Text>
              <Text style={styles.ticketMessage} numberOfLines={3}>{ticket.message}</Text>
              <Text style={styles.ticketId}>Réf. {ticket.id}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_COLORS.background },
  header: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: APP_SPACING.md,
    paddingVertical: APP_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.paper,
  },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: APP_SPACING.sm },
  headerSpacer: { width: 52 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: APP_COLORS.muted },
  title: { fontSize: 22, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2, textAlign: 'center' },
  subtitle: { fontSize: 12, lineHeight: 17, color: APP_COLORS.muted, marginTop: 2, textAlign: 'center' },
  content: { padding: APP_SPACING.md, paddingBottom: 40 },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    ...(APP_SHADOWS.card ?? {}),
  },
  label: { fontSize: 13, fontWeight: '800', color: APP_COLORS.ink, marginBottom: 8 },
  messageLabel: { marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.background,
    borderRadius: APP_RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: APP_COLORS.ink,
  },
  messageInput: { minHeight: 150 },
  counter: { alignSelf: 'flex-end', marginTop: 6, fontSize: 10, color: APP_COLORS.muted },
  submitBtn: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: APP_RADIUS.md,
    backgroundColor: APP_COLORS.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: APP_SPACING.lg,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: APP_COLORS.muted },
  refreshText: { fontSize: 11, fontWeight: '800', color: APP_COLORS.burgundy },
  loader: { marginTop: 20 },
  emptyCard: {
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.paperSoft,
    padding: APP_SPACING.md,
  },
  emptyText: { fontSize: 12, color: APP_COLORS.muted, textAlign: 'center' },
  ticketCard: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: 10,
  },
  ticketTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ticketSubject: { flex: 1, fontSize: 14, fontWeight: '900', color: APP_COLORS.ink },
  ticketStatus: { fontSize: 10, fontWeight: '800', color: APP_COLORS.burgundy },
  ticketDate: { fontSize: 10, color: APP_COLORS.muted, marginTop: 4 },
  ticketMessage: { fontSize: 12, lineHeight: 18, color: APP_COLORS.ink, marginTop: 10 },
  ticketId: { fontSize: 9, color: APP_COLORS.muted, marginTop: 8 },
});
