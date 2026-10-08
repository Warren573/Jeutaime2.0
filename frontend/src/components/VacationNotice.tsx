import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Affichage du mode vacances dans les profils et les correspondances.
 * Les illustrations femme/homme seront branchées ici dès leur ajout
 * aux assets locaux de l'application.
 */
export function VacationNotice({ gender, compact = false }: { gender?: string | null; compact?: boolean }) {
  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.header}>
        <View style={styles.icon}><Ionicons name="airplane-outline" size={23} color="#A7324B" /></View>
        <View style={styles.heading}>
          <Text style={styles.title}>Mode vacances</Text>
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
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor:'#FFF9F0', borderColor:'#D4BE9E', borderWidth:1,
    borderRadius:16, padding:16, marginVertical:10 },
  compact: { marginVertical:0 },
  header: { flexDirection:'row', alignItems:'center', gap:12 },
  icon: { width:42, height:42, backgroundColor:'#F7ECDD', borderRadius:12,
    alignItems:'center', justifyContent:'center' },
  heading: { flex:1 },
  title: { fontSize:18, fontWeight:'800', color:'#30241E' },
  subtitle: { fontSize:15, color:'#907B65', marginTop:3 },
  line: { height:1, backgroundColor:'#D4BE9E', marginVertical:12 },
  note: { fontSize:13, lineHeight:20, color:'#907B65' },
});
