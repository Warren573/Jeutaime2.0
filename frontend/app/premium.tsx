import { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../src/store/useStore";
import { AppBackButton } from "../src/components/AppBackButton";
import { CoinIcon } from "../src/components/CoinIcon";
import {
  getPremiumPlans,
  getMyPremiumStatus,
  subscribePremium,
  cancelPremium,
  type PremiumPlanDTO,
  type PremiumStatusDTO,
} from "../src/api/premium";
import {
  APP_COLORS,
  APP_RADIUS,
  APP_SHADOWS,
  APP_SPACING,
} from "../src/theme/appTheme";

const ADVANTAGES = [
  { icon: "people-outline", lead: "10 correspondances", rest: " actives au lieu de 5" },
  { icon: "image-outline", lead: "Photos visibles", rest: " dès la sélection des profils" },
  { icon: "bottle", lead: "5 bouteilles", rest: " simultanées au lieu de 1" },
  { icon: "coins", lead: "500 pièces", rest: " offertes à chaque mois facturé" },
  { icon: "ban-outline", lead: "Aucune publicité", rest: " imposée" },
  { icon: "gift-outline", lead: "20 pièces chaque jour", rest: ", comme en Gratuit" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PremiumScreen() {
  const router = useRouter();
  const coins = useStore((s) => s.coins);
  const loadWallet = useStore((s) => s.loadWallet);
  const hydrateFromApi = useStore((s) => s.hydrateFromApi);

  const [status, setStatus] = useState<PremiumStatusDTO | null>(null);
  const [plans, setPlans] = useState<PremiumPlanDTO[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [s, p] = await Promise.all([getMyPremiumStatus(), getPremiumPlans()]);
      setStatus(s);
      setPlans(p);
      setSelectedPlanId((prev) => prev ?? (p[0]?.id ?? null));
    } catch {
      Alert.alert("Erreur", "Impossible de charger le statut premium.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubscribe = async () => {
    if (!selectedPlanId || subscribing) return;
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (!plan) return;

    if (coins < plan.priceCoins) {
      router.push('/shop');
      return;
    }

    Alert.alert(
      "Confirmer l'abonnement",
      `Souscrire au plan ${plan.label} (${plan.durationDays} jours) pour ${plan.priceCoins} pièces ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: async () => {
            try {
              setSubscribing(true);
              await subscribePremium({ planId: plan.id, paymentMethod: "coins" });
              await Promise.all([loadWallet(), hydrateFromApi()]);
              await load();
              Alert.alert("Bienvenue dans Plus", "Tes avantages sont maintenant actifs.");
            } catch (err: any) {
              Alert.alert("Erreur", err?.message ?? "Souscription impossible.");
            } finally {
              setSubscribing(false);
            }
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert(
      "Annuler l'abonnement",
      "Confirmer la demande de résiliation de l'abonnement ?",
      [
        { text: "Conserver Plus", style: "cancel" },
        {
          text: "Annuler quand même",
          style: "destructive",
          onPress: async () => {
            try {
              setCancelling(true);
              await cancelPremium();
              await hydrateFromApi();
              await load();
            } catch (err: any) {
              Alert.alert("Erreur", err?.message ?? "Annulation impossible.");
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={APP_COLORS.burgundy} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const isActive = status?.active ?? false;
  const plan = plans.find((p) => p.id === selectedPlanId);
  const canAfford = plan ? coins >= plan.priceCoins : false;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AppBackButton onPress={() => router.back()} style={styles.backBtn} />

        <Text style={styles.kicker}>ABONNEMENT</Text>
        <Text style={styles.title}>JeuTaime Plus</Text>
        <Text style={styles.subtitle}>Plus de liberté pour faire des rencontres.</Text>

        <View style={[styles.statusCard, isActive ? styles.statusCardActive : styles.statusCardFree]}>
          {isActive ? (
            <>
              <Text style={styles.statusBadge}>Abonnement Plus actif</Text>
              {status?.premiumUntil && (
                <Text style={styles.statusSub}>Actif jusqu'au {formatDate(status.premiumUntil)}</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.statusBadge}>Compte Gratuit</Text>
              <Text style={styles.statusSub}>Découvre les avantages de Plus, sans modifier ton compte.</Text>
            </>
          )}
          <TouchableOpacity onPress={() => router.push('/coins')} activeOpacity={0.75}>
            <View style={styles.coinsBalanceRow}><Text style={styles.coinsBalance}>Solde : {coins}</Text><CoinIcon size={16}/><Text style={styles.coinsBalance}>→</Text></View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>LES AVANTAGES</Text>
        <View style={styles.advantagesCard}>
          {ADVANTAGES.map((a, i) => (
            <View key={i} style={[styles.advantageRow, i < ADVANTAGES.length - 1 && styles.advantageRowBorder]}>
              <View style={styles.advantageIconFrame}>{a.icon === "bottle" ? <Image source={require("../assets/ui-icons/bottle.png")} style={styles.advantagePng} resizeMode="contain" /> : a.icon === "coins" ? <Image source={require("../assets/ui-icons/coin.png")} style={styles.advantagePng} resizeMode="contain" /> : <Ionicons name={a.icon as React.ComponentProps<typeof Ionicons>["name"]} size={24} color={APP_COLORS.burgundy} />}</View>
              <Text style={styles.advantageText}><Text style={styles.advantageLead}>{a.lead}</Text>{a.rest}</Text>
            </View>
          ))}
        </View>

        {!isActive && (
          <View style={styles.planOffer}>
            <View style={styles.planOfferTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerLabel}>ABONNEMENT MENSUEL</Text>
                <Text style={styles.offerPrice}>5,99 € <Text style={styles.offerPeriod}>/ mois</Text></Text>
              </View>
              <View style={styles.coinsPill}><CoinIcon size={17}/><Text style={styles.offerHint}>500 pièces / mois</Text></View>
            </View>
            <Text style={styles.offerNote}>Souscription bientôt disponible. Aucun paiement n'est effectué.</Text>
            <TouchableOpacity style={styles.offerButton} onPress={() => router.push('/shop')}>
              <Text style={styles.offerButtonText}>Retour à la boutique →</Text>
            </TouchableOpacity>
          </View>
        )}

        {isActive && (
          <Pressable
            style={[styles.cancelBtn, cancelling && { opacity: 0.5 }]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color={APP_COLORS.burgundy} />
            ) : (
              <Text style={styles.cancelBtnText}>Annuler mon abonnement</Text>
            )}
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 50 },
  backBtn: { marginBottom: 22 },
  kicker: {
    fontSize: 9,
    fontWeight: "800",
    color: APP_COLORS.muted,
    letterSpacing: 2.4,
    textAlign: "center",
    marginBottom: 3,
  },
  title: { fontSize: 27, fontWeight: "900", color: APP_COLORS.ink, textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 14, color: APP_COLORS.muted, textAlign: "center", marginBottom: 20 },
  statusCard: {
    borderRadius: APP_RADIUS.lg,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    ...(APP_SHADOWS.card ?? {}),
  },
  statusCardActive: { backgroundColor: APP_COLORS.paper, borderColor: APP_COLORS.gold },
  statusCardFree: { backgroundColor: APP_COLORS.paperSoft, borderColor: APP_COLORS.border },
  statusBadge: { fontSize: 17, fontWeight: "800", color: APP_COLORS.ink, marginBottom: 4 },
  statusSub: { fontSize: 13, color: APP_COLORS.muted, marginBottom: 14, lineHeight: 20 },
  coinsBalanceRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  coinsBalance: { fontSize: 14, fontWeight: "800", color: APP_COLORS.burgundy },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: APP_COLORS.muted,
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  advantagesCard: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    overflow: "hidden",
    ...(APP_SHADOWS.card ?? {}),
  },
  advantageRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 15, paddingVertical: 11, gap: 12 },
  advantagePng: { width: 26, height: 26 },
  advantageIconFrame: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F8E9E5", justifyContent: "center", alignItems: "center", flexShrink: 0 },
  advantageLead: { color: APP_COLORS.burgundy, fontWeight: "800" },
  advantageRowBorder: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.paperSoft },
  advantageIcon: { fontSize: 20, width: 26, textAlign: "center" },
  advantageText: { flex: 1, fontSize: 13, color: APP_COLORS.text, lineHeight: 19 },
  advantageDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: APP_COLORS.burgundy },
  planCard: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  planCardSelected: { borderColor: APP_COLORS.burgundy, borderWidth: 2 },
  planLeft: { flex: 1 },
  planLabel: { fontSize: 16, fontWeight: "700", color: APP_COLORS.ink },
  planDuration: { fontSize: 13, color: APP_COLORS.muted, marginTop: 2 },
  planRight: { alignItems: "flex-end" },
  planCoinsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  planCoins: { fontSize: 16, fontWeight: "800", color: APP_COLORS.ink },
  planCoinsLow: { color: APP_COLORS.muted },
  planCoinsLowLabel: { fontSize: 11, color: APP_COLORS.muted, marginTop: 2 },
  planDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: APP_COLORS.burgundy, marginLeft: 12 },
  subscribeBtn: {
    marginTop: 16,
    height: 54,
    borderRadius: APP_RADIUS.lg,
    backgroundColor: APP_COLORS.burgundy,
    justifyContent: "center",
    alignItems: "center",
    ...(APP_SHADOWS.card ?? {}),
  },
  subscribeBtnDisabled: { opacity: 0.45 },
  subscribeBtnText: { color: APP_COLORS.white, fontSize: 16, fontWeight: "800" },
  stripeBanner: { alignItems: "center", paddingVertical: 14 },
  stripeText: { fontSize: 12, color: APP_COLORS.muted },
  planOffer: { backgroundColor: APP_COLORS.paper, borderRadius: 18, padding: 17, borderWidth: 1, borderColor: APP_COLORS.gold },
  planOfferTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offerLabel: { fontSize: 10, color: APP_COLORS.muted, fontWeight: '800', letterSpacing: 1.1 },
  offerPrice: { fontSize: 27, color: APP_COLORS.ink, fontWeight: '800', marginTop: 5 },
  offerPeriod: { fontSize: 13, fontWeight: '500', color: APP_COLORS.muted },
  offerHint: { flexShrink: 1, color: APP_COLORS.burgundy, fontSize: 11, fontWeight: "800" },
  coinsPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#F8E9E5", borderRadius: 22, paddingVertical: 8, paddingHorizontal: 9, maxWidth: 150 },
  offerNote: { fontSize: 12, color: APP_COLORS.muted, lineHeight: 18, marginTop: 12 },
  offerButton: { backgroundColor: APP_COLORS.burgundy, alignItems: 'center', justifyContent: 'center', borderRadius: 12, minHeight: 46, marginTop: 14 },
  offerButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  cancelBtn: {
    marginTop: 32,
    height: 52,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: APP_COLORS.burgundy,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: APP_COLORS.burgundy },
});
