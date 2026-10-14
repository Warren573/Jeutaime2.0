import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { CoinIcon } from '../components/CoinIcon';
import { AppBackButton } from '../components/AppBackButton';
import { APP_COLORS as C } from '../theme/appTheme';

const PACKS = [
  { amount: '100', price: '0,99 €' },
  { amount: '500', price: '2,99 €' },
  { amount: '1 000', price: '4,99 €' },
] as const;

export default function ShopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const coins = useStore(s => s.coins);
  const loadWallet = useStore(s => s.loadWallet);
  useEffect(() => { void loadWallet(); }, [loadWallet]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <AppBackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Boutique</Text>
        <View style={{ width: 62 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 36 }]} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.wallet} onPress={() => router.push('/coins')} activeOpacity={0.8}>
          <View>
            <Text style={styles.eyebrow}>MON PORTEFEUILLE</Text>
            <Text style={styles.walletLabel}>Solde disponible</Text>
          </View>
          <View style={styles.walletRight}><CoinIcon size={25}/><Text style={styles.walletAmount}>{coins ?? 0}</Text><Text style={styles.arrow}>›</Text></View>
        </TouchableOpacity>

        <Text style={styles.section}>ABONNEMENT</Text>
        <TouchableOpacity style={styles.plus} activeOpacity={0.85} onPress={() => router.push('/premium')}>
          <View style={styles.plusTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.plusKicker}>JEUTAIME PLUS</Text>
              <Text style={styles.plusPrice}>5,99 € <Text style={styles.plusPeriod}>/ mois</Text></Text>
            </View>
            <Text style={styles.plusArrow}>›</Text>
          </View>
          <Text style={styles.plusDetails}>10 correspondances · 5 bouteilles · photos visibles</Text>
          <View style={styles.plusBottom}><Text style={styles.plusLink}>Découvrir les avantages</Text><Text style={styles.plusLink}>→</Text></View>
        </TouchableOpacity>

        <View style={styles.sectionHeading}><Text style={styles.section}>PACKS DE PIÈCES</Text><Text style={styles.muted}>Bientôt disponibles</Text></View>
        <View style={styles.packs}>
          {PACKS.map(pack => (
            <View key={pack.amount} style={styles.pack}>
              <CoinIcon size={22}/>
              <Text style={styles.packAmount}>{pack.amount}</Text>
              <Text style={styles.packCoins}>pièces</Text>
              <Text style={styles.packPrice}>{pack.price}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.notice}>Les paiements ne sont pas encore activés. Aucun achat ne sera débité.</Text>

        <Text style={styles.section}>OFFRANDES</Text>
        <TouchableOpacity style={styles.giftRow} onPress={() => router.push('/(tabs)/letters')} activeOpacity={0.8}>
          <View style={{ flex: 1 }}>
            <Text style={styles.giftTitle}>Faire un cadeau</Text>
            <Text style={styles.giftText}>Retrouve tes correspondants pour leur envoyer une offrande personnelle.</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
        <Text style={styles.footer}>Les boissons et les magies sont disponibles directement dans les salons.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: { backgroundColor: C.paper, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 18, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  scroll: { paddingHorizontal: 18, paddingTop: 18 },
  wallet: { backgroundColor: C.paper, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: C.border },
  eyebrow: { color: C.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  walletLabel: { color: C.ink, fontSize: 15, marginTop: 4, fontWeight: '600' },
  walletRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  walletAmount: { color: C.ink, fontSize: 25, fontWeight: '800' },
  arrow: { color: C.burgundy, fontSize: 26, paddingLeft: 8 },
  section: { color: C.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginTop: 24, marginBottom: 10 },
  plus: { borderRadius: 18, backgroundColor: C.burgundy, padding: 20 },
  plusTop: { flexDirection: 'row', alignItems: 'flex-start' },
  plusKicker: { color: '#F6D8C8', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  plusPrice: { fontSize: 31, color: '#FFFFFF', fontWeight: '800', marginTop: 5 },
  plusPeriod: { fontSize: 16, fontWeight: '500' },
  plusArrow: { color: '#FFFFFF', fontSize: 32 },
  plusDetails: { color: '#FCEBE3', fontSize: 13, lineHeight: 20, marginTop: 10 },
  plusBottom: { marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#B55A65', flexDirection: 'row', justifyContent: 'space-between' },
  plusLink: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  muted: { color: C.muted, fontSize: 11 },
  packs: { flexDirection: 'row', gap: 9 },
  pack: { flex: 1, minWidth: 0, alignItems: 'center', backgroundColor: C.paper, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingVertical: 16, paddingHorizontal: 4 },
  packAmount: { fontSize: 19, fontWeight: '800', color: C.ink, marginTop: 8 },
  packCoins: { color: C.muted, fontSize: 11 },
  packPrice: { fontWeight: '800', color: C.burgundy, fontSize: 14, marginTop: 9 },
  notice: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 10 },
  giftRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16 },
  giftTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  giftText: { fontSize: 12, lineHeight: 18, color: C.muted, marginTop: 5 },
  footer: { fontSize: 11, color: C.muted, lineHeight: 17, marginTop: 12 },
});
