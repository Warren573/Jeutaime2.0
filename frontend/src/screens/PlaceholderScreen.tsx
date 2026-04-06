import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

interface Props {
  icon: string;
  title: string;
  description?: string;
}

export default function PlaceholderScreen({
  icon,
  title,
  description = 'Cette fonctionnalité sera disponible prochainement.',
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{description}</Text>
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>🚧 En cours de développement</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#FFF8E7' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E8D5B7', backgroundColor: '#FFF' },
  back:            { fontSize: 15, fontWeight: '600', color: '#C4924A', width: 60 },
  headerTitle:     { fontSize: 17, fontWeight: '700', color: '#3A2818', flex: 1, textAlign: 'center' },
  body:            { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon:            { fontSize: 64, marginBottom: 20 },
  title:           { fontSize: 24, fontWeight: '800', color: '#3A2818', textAlign: 'center', marginBottom: 12 },
  desc:            { fontSize: 16, color: '#8B6F47', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  comingSoon:      { backgroundColor: '#FFE082', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  comingSoonText:  { fontSize: 14, fontWeight: '700', color: '#5D4037' },
});
