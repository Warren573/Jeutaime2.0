import React, { useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBackButton } from './AppBackButton';
import { RefugeDayResultIcon } from './RefugeDayResultIcon';
import { RefugeRevealPhase } from './RefugeRevealPhase';
import { dayCoinsLabel, reportLines, revealOffered, type FinalReportData } from '../data/refugeFinalReport';
import { serverNow } from '../data/refugeClock';

const REFUGE_BACKGROUND = require('../../assets/images/refuge/refuge-watercolor-bg.png');
const parchment = '#EED3AA', ink = '#4A2B1C', burgundy = '#8A2F3C', rule = '#A77548';

type RevealProps = React.ComponentProps<typeof RefugeRevealPhase>;

/**
 * Fin de l'aventure : bilan des sept jours, puis dévoilement. Mêmes couleurs, polices et fond que le Refuge.
 * Le dévoilement n'est JAMAIS proposé avant l'expiration des 168 h (le serveur le refuse aussi) et aucune identité n'est
 * affichée avant l'accord mutuel (c'est RefugeRevealPhase, déjà en place, qui gère la révélation).
 */
export function RefugeEndScreen(props: {
  report: FinalReportData | null;
  status: string;
  endsAt: string | null;
  serverOffsetMs: number;
  onBack: () => void;
  reveal: RevealProps['reveal'];
  revealProps: Omit<RevealProps, 'reveal' | 'status'>;
}) {
  const { report, status, endsAt, serverOffsetMs, onBack, reveal, revealProps } = props;
  const decided = status === 'REVEALED' || status === 'COMPLETED';
  const offered = decided || revealOffered({ available: reveal.available, endsAt, serverNowMs: serverNow(serverOffsetMs) });
  const [step, setStep] = useState<'report' | 'reveal'>(report ? 'report' : 'reveal');

  return (
    <SafeAreaView style={styles.root}>
      <ImageBackground source={REFUGE_BACKGROUND} resizeMode="cover" style={styles.bg}>
        <View style={styles.header}>
          <AppBackButton onPress={onBack} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.sheet}>
            <View style={styles.tape} />
            <Text style={styles.eyebrow}>BILAN DE L’AVENTURE</Text>
            <Text style={styles.title}>Les sept jours sont écoulés</Text>

            {step === 'report' && report ? (
              <>
                <View style={styles.calendar} accessibilityLabel="Calendrier des sept journées">
                  {report.days.map((d) => (
                    <View key={d.dayNumber} style={styles.day}>
                      <Text style={styles.dayNumber}>{d.dayNumber}</Text>
                      <RefugeDayResultIcon status={d.status} symbol={d.symbol} size={22} />
                      <Text style={styles.dayCoins}>{dayCoinsLabel(d)}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.lines}>
                  {reportLines(report).map((l) => (
                    <View key={l.key} style={styles.line}>
                      <Text style={[styles.label, l.strong && styles.strong]}>{l.label}</Text>
                      <Text style={[styles.value, l.strong && styles.strong]}>{l.value}</Text>
                    </View>
                  ))}
                </View>
                {offered ? (
                  <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={() => setStep('reveal')}>
                    <Text style={styles.primaryText}>{decided ? 'Voir la suite' : 'Continuer vers le dévoilement'}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.note}>Le dévoilement sera proposé à la fin des sept jours.</Text>
                )}
              </>
            ) : offered ? (
              <>
                <RefugeRevealPhase {...revealProps} status={status} reveal={reveal} />
                {report ? (
                  <TouchableOpacity accessibilityRole="button" style={styles.secondary} onPress={() => setStep('report')}>
                    <Text style={styles.secondaryText}>Revoir le bilan</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <Text style={styles.note}>Le dévoilement sera proposé à la fin des sept jours.</Text>
            )}
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EFE1' },
  bg: { flex: 1 },
  header: { paddingHorizontal: 12, paddingTop: 8 },
  scroll: { padding: 16, paddingBottom: 40 },
  sheet: { backgroundColor: 'rgba(238,211,170,.95)', borderWidth: 1, borderColor: rule, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 20, alignItems: 'center' },
  tape: { position: 'absolute', top: -7, width: 70, height: 14, backgroundColor: 'rgba(205,170,112,.76)' },
  eyebrow: { fontFamily: 'Georgia', fontSize: 10, letterSpacing: 2.4, color: '#7A5A3C', marginTop: 4 },
  title: { fontFamily: 'Georgia', fontWeight: '700', fontSize: 22, color: burgundy, textAlign: 'center', marginTop: 6, marginBottom: 14 },
  calendar: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginBottom: 14 },
  day: { alignItems: 'center', width: '13%' },
  dayNumber: { fontFamily: 'Georgia', fontSize: 11, color: ink, marginBottom: 3 },
  dayCoins: { fontFamily: 'Georgia', fontSize: 10, color: ink, marginTop: 3 },
  lines: { alignSelf: 'stretch', borderTopWidth: 1, borderTopColor: rule },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(167,117,72,.35)' },
  label: { flex: 1, fontFamily: 'Georgia', fontSize: 13, color: ink },
  value: { flexShrink: 1, fontFamily: 'Georgia', fontSize: 13, color: ink, fontWeight: '700', textAlign: 'right' },
  strong: { color: burgundy, fontSize: 15 },
  primary: { alignSelf: 'stretch', marginTop: 16, backgroundColor: burgundy, borderRadius: 3, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#FFF2DE', fontFamily: 'Georgia', fontWeight: '700', fontSize: 13 },
  secondary: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 },
  secondaryText: { color: burgundy, fontFamily: 'Georgia', fontWeight: '700', fontSize: 12 },
  note: { fontFamily: 'Georgia', fontSize: 12, lineHeight: 17, color: ink, textAlign: 'center', marginTop: 14 },
});
