import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Affiche le visuel de vacances dans le profil ou une correspondance existante. */
export function VacationNotice({ gender, compact = false }: { gender?: string | null; compact?: boolean }) {

  const { width } = useWindowDimensions();
  const horizontal = compact && width >= 340;
  return (
    <View style={[styles.card, compact && styles.compact, horizontal && styles.horizontal]}>

      <View style={horizontal ? styles.sideContent : styles.fullContent}>
        <View style={styles.header}>
          <Ionicons name="airplane-outline" size={22} color="#A7324B" />
          <View style={styles.heading}>
            <Text style={styles.title} numberOfLines={2}>Mode vacances</Text>
            <Text style={styles.subtitle}>Bientôt de retour</Text>
          </View>
        </View>
        <View style={styles.line} />
        <Text style={styles.note}>
          {compact
            ? 'Ce profil est temporairement masqué dans la sélection de profils.'
            : 'Correspondance en pause pendant les vacances. Vos anciennes lettres restent accessibles.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor:'#FFF9F0', borderColor:'#D4BE9E', borderWidth:1,
    borderRadius:16, padding:12, marginVertical:10 },
  compact: { marginVertical:0 },
  horizontal: { flexDirection:'row', alignItems:'center', gap:12 },
  artwork: { width:'100%', aspectRatio:4/3, borderRadius:10, marginBottom:12, backgroundColor:'#F7ECDD' },
  artworkSide: { width:'42%', aspectRatio:4/3, borderRadius:10, backgroundColor:'#F7ECDD' },
  sideContent: { flex:1 },
  fullContent: { width:'100%' },
  header: { flexDirection:'row', alignItems:'flex-start', gap:8 },
  heading: { flex:1 },
  title: { fontSize:16, fontWeight:'800', color:'#30241E' },
  subtitle: { fontSize:14, color:'#907B65', marginTop:4 },
  line: { height:1, backgroundColor:'#D4BE9E', marginVertical:10 },
  note: { fontSize:12, lineHeight:17, color:'#907B65' },
});
