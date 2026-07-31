import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BottleParchmentCardProps {
  content: string;
  createdAt: string;
  source: 'INITIAL_BOTTLE' | 'ANONYMOUS_MESSAGE';
  isMine?: boolean;
  compact?: boolean;
}

const COLORS = {
  text: '#4A3A28',
  date: '#8A6E3C',
  border: 'rgba(200, 162, 90, 0.3)',
};

export const BottleParchmentCard: React.FC<BottleParchmentCardProps> = ({
  content,
  createdAt,
  source,
  isMine = false,
  compact = false,
}) => {
  const date = new Date(createdAt).toLocaleDateString('fr-FR', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const sourceLabel =
    source === 'INITIAL_BOTTLE' ? '📨 Lettre initiale' : '💌 Réponse';

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.content}>
        <Text style={styles.message}>{content}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.source}>{sourceLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: '#F3E7C6',
    borderWidth: 2,
    borderColor: '#C8A25A',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#3B2C18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardCompact: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  content: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    lineHeight: 28,
    color: COLORS.text,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  date: {
    fontSize: 12,
    color: COLORS.date,
    fontWeight: '500',
  },
  source: {
    fontSize: 12,
    color: COLORS.date,
    fontWeight: '500',
  },
});
