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
} from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../src/store/useStore";
import { AppBackButton } from "../src/components/AppBackButton";
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
  { icon: "💌", text: "Jusqu'à 20 matches simultanés (5 en free)" },
  { icon: "📸", text: "Photos dévoilées plus tôt dans la relation" },
  { icon: "🌟", text: "Bonus quotidien doublé (50 🪙)" },
  { icon: "🎭", text: "Accès à toutes les magies" },
  { icon: "✨", text: "Priorité dans la découverte" },
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
      `Souscrire au plan ${plan.label} (${plan.durationDays} jours) pour ${plan.priceCoins} 🪙 ?`,
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
              Alert.alert("🎉 Bienvenue en Premium !", "Tes avantages sont maintenant actifs.");
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
      "Tu perdras immédiatement tes avantages Premium. Continuer ?",
      [
        { text: "Garder Premium", style: "cancel" },
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

        <Text style={styles.kicker}>JEUTAIME</Text>
        <Text style={styles.title}>👑 Premium</Text>
        <Text style={styles.subtitle}>Vis JeuTaime sans limites.</Text>

        <View style={[styles.statusCard, isActive ? styles.statusCardActive : styles.statusCardFree]}>
          {isActive ? (
            <>
              <Text style={styles.statusBadge}>✨ Membre Premium</Text>
              {status?.premiumUntil && (
                <Text style={styles.statusSub}>Actif jusqu'au {formatDate(status.premiumUntil)}</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.statusBadge}>Compte Free</Text>
              <Text style={styles.statusSub}>Passe en Premium pour tout débloquer.</Text>
            </>
          )}
          <TouchableOpacity onPress={() => router.push('/coins')} activeOpacity={0.75}>
            <Text style={styles.coinsBalance}>Solde : {coins} 🪙  →</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Ce que tu débloques</Text>
        <View style={styles.advantagesCard}>
          {ADVANTAGES.map((a, i) => (
            <View key={i} style={[styles.advantageRow, i < ADVANTAGES.length - 1 && styles.advantageRowBorder]}>
              <Text style={styles.advantageIcon}>{a.icon}</Text>
              <Text style={styles.advantageText}>{a.text}</Text>
            </View>
          ))}
        </View>

        {!isActive && plans.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Choisir un plan</Text>

            {plans.map((p) => {
              const isSelected = selectedPlanId === p.id;
              const affordable = coins >= p.priceCoins;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.planCard, isSelected && styles.planCardSelected]}
                  onPress={() => setSelectedPlanId(p.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.planLeft}>
                    <Text style={styles.planLabel}>{p.label}</Text>
                    <Text style={styles.planDuration}>{p.durationDays} jours</Text>
                  </View>
                  <View style={styles.planRight}>
                    <Text style={[styles.planCoins, !affordable && styles.planCoinsLow]}>{p.priceCoins} 🪙</Text>
                    {!affordable && <Text style={styles.planCoinsLowLabel}>solde insuffisant</Text>}
                  </View>
                  {isSelected && <View style={styles.planDot} />}
                </TouchableOpacity>
              );
            })}

            <Pressable
              style={[styles.subscribeBtn, subscribing && styles.subscribeBtnDisabled]}
              onPress={handleSubscribe}
              disabled={subscribing}
            >
              {subscribing ? (
                <ActivityIndicator color={APP_COLORS.white} />
              ) : (
                <Text style={styles.subscribeBtnText}>
                  {canAfford ? `Souscrire — ${plan?.priceCoins ?? "…"} 🪙` : "Voir la boutique"}
                </Text>
              )}
            </Pressable>

            <View style={styles.stripeBanner}>
              <Text style={styles.stripeText}>💳 Paiement par carte — bientôt disponible</Text>
            </View>
          </>
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
  container: { padding: APP_SPACING.xl, paddingBottom: 60 },
  backBtn: { marginBottom: APP_SPACING.md },
  kicker: {
    fontSize: 9,
    fontWeight: "800",
    color: APP_COLORS.muted,
    letterSpacing: 2.4,
    textAlign: "center",
    marginBottom: 3,
  },
  title: { fontSize: 32, fontWeight: "900", color: APP_COLORS.ink, textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 14, color: APP_COLORS.muted, textAlign: "center", marginBottom: APP_SPACING.xl },
  statusCard: {
    borderRadius: APP_RADIUS.lg,
    padding: APP_SPACING.lg,
    marginBottom: 28,
    borderWidth: 1,
    ...(APP_SHADOWS.card ?? {}),
  },
  statusCardActive: { backgroundColor: APP_COLORS.paper, borderColor: APP_COLORS.gold },
  statusCardFree: { backgroundColor: APP_COLORS.paperSoft, borderColor: APP_COLORS.border },
  statusBadge: { fontSize: 17, fontWeight: "800", color: APP_COLORS.ink, marginBottom: 4 },
  statusSub: { fontSize: 13, color: APP_COLORS.muted, marginBottom: 14, lineHeight: 20 },
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
    marginBottom: 28,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    overflow: "hidden",
    ...(APP_SHADOWS.card ?? {}),
  },
  advantageRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  advantageRowBorder: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.paperSoft },
  advantageIcon: { fontSize: 20, width: 26, textAlign: "center" },
  advantageText: { flex: 1, fontSize: 14, color: APP_COLORS.text, lineHeight: 20 },
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
