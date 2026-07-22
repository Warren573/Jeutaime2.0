import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import {
  getInbox,
  getBottleMessages,
  postBottleMessage,
  markBottleAsRead,
  InboxBottleDTO,
  BottleMessageDTO,
} from '../api/bottles';

const COLORS = {
  bg: '#F5F1E8',
  card: '#FFFFFF',
  text: '#2B2B2B',
  textSecondary: '#6B6B6B',
  border: '#D8D2C4',
  accent: '#8B2E3C',
  accentLight: '#E8CFCF',
  myMessage: '#8B2E3C',
  otherMessage: '#E8CFCF',
};

export default function BottleDiscussionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const bottleId = params.bottleId as string;
  const { currentUser } = useStore();

  const [bottle, setBottle] = useState<InboxBottleDTO | null>(null);
  const [messages, setMessages] = useState<BottleMessageDTO[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (!bottleId) return;

      // Load bottle details
      const bottleData = await getInbox();
      const found = bottleData.find(b => b.id === bottleId);
      if (found) {
        setBottle(found);
      }

      // Load messages
      const msgs = await getBottleMessages(bottleId);
      setMessages(msgs);

      // Mark bottle as read
      await markBottleAsRead(bottleId);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger la discussion');
    } finally {
      setIsLoading(false);
    }
  }, [bottleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      Alert.alert('Erreur', 'Écris un message');
      return;
    }

    if (messageText.length > 500) {
      Alert.alert('Erreur', `Maximum 500 caractères (tu as ${messageText.length})`);
      return;
    }

    setIsSending(true);
    try {
      const newMsg = await postBottleMessage(bottleId, messageText.trim());
      setMessages([...messages, newMsg]);
      setMessageText('');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur d\'envoi');
    } finally {
      setIsSending(false);
    }
  };

  const handleReport = async () => {
    Alert.alert(
      'Signaler cette conversation?',
      'La personne sera notifiée et pourra être suspendue après 3 signalements.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Signaler',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Call API endpoint to report
              Alert.alert('Succès', 'Conversation signalée');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de signaler');
            }
          },
        },
      ]
    );
  };

  const handleArchive = () => {
    Alert.alert(
      'Archiver cette discussion?',
      'Elle sera masquée de la liste des discussions.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Archiver',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Succès', 'Discussion archivée');
            router.back();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!bottle) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <Text style={styles.errorText}>Bouteille non trouvée</Text>
      </View>
    );
  }

  const charRemaining = 500 - messageText.length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: COLORS.bg }]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBack}>← Retour</Text>
        </TouchableOpacity>
      </View>

      {/* Bottle Info */}
      <View style={styles.bottleInfo}>
        <Text style={styles.bottleGender}>{bottle.targetGender}</Text>
        <Text style={styles.bottleDetails}>
          , {bottle.senderCity}
        </Text>
      </View>

      <View style={styles.bottleMessage}>
        <Text style={styles.bottleMessageLabel}>Message original:</Text>
        <Text style={styles.bottleMessageText}>"{bottle.message}"</Text>
      </View>

      {/* Messages */}
      <ScrollView
        style={styles.messageScroll}
        contentContainerStyle={styles.messageContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.noMessages}>
            <Text style={styles.noMessagesText}>Aucun message encore</Text>
            <Text style={styles.noMessagesSubtext}>Sois le premier à écrire!</Text>
          </View>
        ) : (
          messages.map((msg, idx) => {
            const isMyMessage = msg.senderId === currentUser?.id;
            return (
              <View
                key={msg.id || idx}
                style={[
                  styles.messageBubble,
                  isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
                ]}
              >
                <Text style={styles.messageText}>{msg.content}</Text>
                <Text
                  style={[
                    styles.messageTime,
                    isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
                  ]}
                >
                  {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputSection, { paddingBottom: insets.bottom + 12 }]}>
        <TextInput
          style={styles.messageInput}
          placeholder="Écris un message (max 500)..."
          placeholderTextColor={COLORS.textSecondary}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          numberOfLines={3}
          maxLength={500}
        />
        <Text
          style={[
            styles.charCount,
            charRemaining < 50 && styles.charCountWarning,
          ]}
        >
          {charRemaining}
        </Text>

        <TouchableOpacity
          style={[styles.sendBtn, (isSending || !messageText.trim()) && styles.sendBtnDisabled]}
          onPress={handleSendMessage}
          disabled={isSending || !messageText.trim()}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={COLORS.card} />
          ) : (
            <Text style={styles.sendBtnText}>Envoyer</Text>
          )}
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleReport}>
            <Text style={styles.actionBtnText}>Signaler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleArchive}>
            <Text style={styles.actionBtnText}>Archiver</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBack: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  bottleInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bottleGender: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  bottleDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  bottleMessage: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bottleMessageLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  bottleMessageText: {
    fontSize: 13,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  messageScroll: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  noMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  noMessagesText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  noMessagesSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  messageBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '80%',
  },
  myMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.myMessage,
  },
  otherMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.otherMessage,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: COLORS.card,
    opacity: 0.7,
  },
  otherMessageTime: {
    color: COLORS.text,
    opacity: 0.6,
  },
  inputSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  messageInput: {
    minHeight: 60,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 6,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  charCountWarning: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  sendBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    marginBottom: 12,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.card,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.accent,
    textAlign: 'center',
  },
});
