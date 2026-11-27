import React, { useEffect, useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppBackButton } from './AppBackButton';
import { RefugeRevealPhase } from './RefugeRevealPhase';
import { dayCoinsLabel, reportLines, type FinalReportData } from '../data/refugeFinalReport';
import { calendarGlyph, deriveEndView, reportIsAutomatic, shouldArchiveOnLeave } from '../data/refugeEndFlow';

const REFUGE_BACKGROUND = require('../../assets/images/refuge/refuge-watercolor-bg.png');
const parchment = '#EED3AA', ink = '#4A2B1C', burgundy = '#8A2F3C', rule = '#A77548';

type RevealProps = React.ComponentProps<typeof RefugeRevealPhase>;

/**
 * Fin de l'aventure (168 h écoulées). Dévoilement AUTOMATIQUE : bilan (une fois), puis « Une nouvelle histoire commence »
 * (profils dévoilés, sourires et match déjà créés par le serveur) ; aucun consentement, aucune attente. La vue est dérivée
 * de l'état serveur (voir data/refugeEndFlow). Le bilan n'est ensuite revu que volontairement (« Revoir le bilan »).
 * Quitter l'écran d'arrivée archive l'aventure pour cette personne seulement : son Refuge est libéré.
 */
export function RefugeEndScreen(props: {
  report: FinalReportData | null;
  status: string;
  sessionId: string;
  currentUserId: string | null;
  /** `archive` : vrai quand la personne quitte l'écran d'arrivée (libère son Refuge) ; faux depuis le bilan automatique. */
  onBack: (archive: boolean) => void;
  revealProps: Omit<RevealProps, 'status' | 'view' | 'sessionId' | 'currentUserId' | 'onReviewReport' | 'reveal' | 'isSubmitting' | 'onDecision'>;
}) {
  const { report, status, sessionId, currentUserId, onBack, revealProps } = props;
  const [reviewRequested, setReviewRequested] = useState(false);
  // null = lecture du drapeau « bilan déjà vu » en cours.
  const [reportSeen, setReportSeen] = useState<boolean | null>(null);
  const seenKey = `refugeReportSeen:${sessionId}:${currentUserId ?? 'anon'}`;

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(seenKey)
      .then((v) => { if (!cancelled) setReportSeen(v === '1'); })
      .catch(() => { if (!cancelled) setReportSeen(false); });
    return () => { cancelled = true; };
  }, [seenKey]);

  const markReportSeen = () => {
    setReportSeen(true);
    AsyncStorage.setItem(seenKey, '1').catch(() => {});
  };

  const view = deriveEndView({ status, hasReport: !!report, reportSeen, reviewRequested });
  const automaticReport = reportIsAutomatic(view, reviewRequested);

  // Le bouton retour : depuis un bilan consulté volontairement, il referme le bilan ; sinon il quitte le Refuge.
  const handleBack = () => (view === 'report' && reviewRequested ? setReviewRequested(false) : onBack(shouldArchiveOnLeave(view)));

  const continueFromReport = () => {
    if (reviewRequested) setReviewRequested(false);
    else markReportSeen();
  };

  return (
    <View style={styles.root}>
      <ImageBackground source={REFUGE_BACKGROUND} resizeMode="cover" style={styles.bg} imageStyle={styles.bgImage}>
        {/* Le fond couvre tout l'écran ; seules les marges de sécurité décalent le contenu. */}
        <SafeAreaView style={styles.bg}>
        <View style={styles.header}>
          <AppBackButton onPress={handleBack} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.sheet}>
            {view === 'loading' ? null : view === 'report' && report ? (
              <>
                <Text style={styles.eyebrow}>BILAN DE L’AVENTURE</Text>
                <Text style={styles.title}>Les sept jours sont écoulés</Text>
                <View style={styles.calendar} accessibilityLabel="Calendrier des sept journées">
                  {report.days.map((d) => {
                    const g = calendarGlyph(d);
                    return (
                      <View key={d.dayNumber} style={styles.day}>
                        <Text style={styles.dayNumber}>{d.dayNumber}</Text>
                        <Text style={[styles.heart, g.filled && styles.heartFull]}>{g.glyph}</Text>
                        <Text style={styles.dayCoins}>{dayCoinsLabel(d)}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.lines}>
                  {reportLines(report).map((l) => (
                    <View key={l.key} style={styles.line}>
                      <Text style={[styles.label, l.strong && styles.strong]}>{l.label}</Text>
                      <Text style={[styles.value, l.strong && styles.strong]}>{l.value}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={continueFromReport}>
                  <Text style={styles.primaryText}>{reviewRequested ? 'Fermer le bilan' : 'Voir la suite'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <RefugeRevealPhase
                {...revealProps}
                sessionId={sessionId}
                currentUserId={currentUserId}
                status={status}
                view={view === 'revealed' ? 'revealed' : 'ended'}
                onReviewReport={report ? () => setReviewRequested(true) : undefined}
              />
            )}
          </View>
        </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EFE1' },
  bg: { flex: 1 },
  bgImage: { width: '100%', height: '100%' },
  header: { paddingHorizontal: 12, paddingTop: 8 },
  // Panneau centré horizontalement ET verticalement ; ne défile que si l'écran est trop petit pour son contenu.
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 24 },
  sheet: { width: '100%', maxWidth: 440, backgroundColor: 'rgba(246,238,220,.96)', borderWidth: 1, borderColor: rule, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 20, alignItems: 'center' },
  eyebrow: { fontFamily: 'Georgia', fontSize: 10, letterSpacing: 2.4, color: '#7A5A3C' },
  title: { fontFamily: 'Georgia', fontWeight: '700', fontSize: 22, color: burgundy, textAlign: 'center', marginTop: 6, marginBottom: 14 },
  calendar: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginBottom: 14 },
  day: { alignItems: 'center', width: '13%' },
  dayNumber: { fontFamily: 'Georgia', fontSize: 12, fontWeight: '600', color: ink, marginBottom: 2 },
  // Mêmes glyphes et couleurs que le calendrier du Refuge (♥ plein bordeaux, ♡ vide grisé).
  heart: { color: '#9E876C', fontSize: 20 },
  heartFull: { color: burgundy },
  dayCoins: { fontFamily: 'Georgia', fontSize: 10, color: ink, marginTop: 2 },
  lines: { alignSelf: 'stretch', borderTopWidth: 1, borderTopColor: rule },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(167,117,72,.35)' },
  label: { flex: 1, fontFamily: 'Georgia', fontSize: 13, color: ink },
  value: { flexShrink: 1, fontFamily: 'Georgia', fontSize: 13, color: ink, fontWeight: '700', textAlign: 'right' },
  strong: { color: burgundy, fontSize: 15 },
  primary: { alignSelf: 'stretch', marginTop: 16, backgroundColor: burgundy, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontFamily: 'Georgia', fontWeight: '700', fontSize: 14 },
});
