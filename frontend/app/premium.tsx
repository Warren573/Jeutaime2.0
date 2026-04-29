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
import {
  getPremiumPlans,
  getMyPremiumStatus,
  subscribePremium,
  cancelPremium,
  type PremiumPlanDTO,
  type PremiumStatusDTO,
} from "../src/api/premium";

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
      Alert.alert(
        "Solde insuffisant",
        `Il te faut ${plan.priceCoins} 🪙 pour ce plan. Tu en as ${coins}.`,
      );
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
          <ActivityIndicator color="#9c2f45" size="large" />
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>👑 Premium</Text>
        <Text style={styles.subtitle}>Vis JeuTaime sans limites.</Text>

        {/* Statut actuel */}
        <View style={[styles.statusCard, isActive ? styles.statusCardActive : styles.statusCardFree]}>
          {isActive ? (
            <>
              <Text style={styles.statusBadge}>✨ Membre Premium</Text>
              {status?.premiumUntil && (
                <Text style={styles.statusSub}>
                  Actif jusqu'au {formatDate(status.premiumUntil)}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.statusBadge}>Compte Free</Text>
              <Text style={styles.statusSub}>Passe en Premium pour tout débloquer.</Text>
            </>
          )}
          <Text style={styles.coinsBalance}>Solde : {coins} 🪙</Text>
        </View>

        {/* Avantages */}
        <Text style={styles.sectionTitle}>Ce que tu débloques</Text>
        <View style={styles.advantagesCard}>
          {ADVANTAGES.map((a, i) => (
            <View key={i} style={[styles.advantageRow, i < ADVANTAGES.length - 1 && styles.advantageRowBorder]}>
              <Text style={styles.advantageIcon}>{a.icon}</Text>
              <Text style={styles.advantageText}>{a.text}</Text>
            </View>
          ))}
        </View>

        {/* Plans — seulement si pas déjà premium */}
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
                    <Text style={[styles.planCoins, !affordable && styles.planCoinsLow]}>
                      {p.priceCoins} 🪙
                    </Text>
                    {!affordable && (
                      <Text style={styles.planCoinsLowLabel}>solde insuffisant</Text>
                    )}
                  </View>
                  {isSelected && <View style={styles.planDot} />}
                </TouchableOpacity>
              );
            })}

            <Pressable
              style={[styles.subscribeBtn, (!canAfford || subscribing) && styles.subscribeBtnDisabled]}
              onPress={handleSubscribe}
              disabled={!canAfford || subscribing}
            >
              {subscribing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.subscribeBtnText}>
                  {canAfford
                    ? `Souscrire — ${plan?.priceCoins ?? "…"} 🪙`
                    : "Solde insuffisant"}
                </Text>
              )}
            </Pressable>

            <View style={styles.stripeBanner}>
              <Text style={styles.stripeText}>💳 Paiement par carte — bientôt disponible</Text>
            </View>
          </>
        )}

        {/* Annulation */}
        {isActive && (
          <Pressable
            style={[styles.cancelBtn, cancelling && { opacity: 0.5 }]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#9c2f45" />
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
  safeArea:              { flex: 1, backgroundColor: "#f6f1ea" },
  loadingWrap:           { flex: 1, justifyContent: "center", alignItems: "center" },
  container:             { padding: 24, paddingBottom: 60 },

  backBtn:               { alignSelf: "flex-start", marginBottom: 16 },
  backText:              { fontSize: 15, color: "#667eea", fontWeight: "600" },

  title:                 { fontSize: 34, fontWeight: "800", color: "#232126", textAlign: "center", marginBottom: 6 },
  subtitle:              { fontSize: 15, color: "#7a746d", textAlign: "center", marginBottom: 24 },

  statusCard:            { borderRadius: 18, padding: 20, marginBottom: 28, borderWidth: 1 },
  statusCardActive:      { backgroundColor: "#FFF8E7", borderColor: "#D7A84E" },
  statusCardFree:        { backgroundColor: "#f0ece5", borderColor: "#d9cec3" },
  statusBadge:           { fontSize: 18, fontWeight: "800", color: "#232126", marginBottom: 4 },
  statusSub:             { fontSize: 14, color: "#7a746d", marginBottom: 14, lineHeight: 20 },
  coinsBalance:          { fontSize: 15, fontWeight: "700", color: "#8B6F47" },

  sectionTitle:          { fontSize: 12, fontWeight: "800", color: "#9c2f45", letterSpacing: 0.8, marginBottom: 12, textTransform: "uppercase" },

  advantagesCard:        { backgroundColor: "#fff", borderRadius: 16, marginBottom: 28, borderWidth: 1, borderColor: "#d9cec3", overflow: "hidden" },
  advantageRow:          { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  advantageRowBorder:    { borderBottomWidth: 1, borderBottomColor: "#f0ece5" },
  advantageIcon:         { fontSize: 20, width: 26, textAlign: "center" },
  advantageText:         { flex: 1, fontSize: 14, color: "#2a272c", lineHeight: 20 },

  planCard:              { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#d9cec3", flexDirection: "row", alignItems: "center" },
  planCardSelected:      { borderColor: "#9c2f45", borderWidth: 2 },
  planLeft:              { flex: 1 },
  planLabel:             { fontSize: 16, fontWeight: "700", color: "#2a272c" },
  planDuration:          { fontSize: 13, color: "#8B6F47", marginTop: 2 },
  planRight:             { alignItems: "flex-end" },
  planCoins:             { fontSize: 16, fontWeight: "800", color: "#2a272c" },
  planCoinsLow:          { color: "#B8A082" },
  planCoinsLowLabel:     { fontSize: 11, color: "#B8A082", marginTop: 2 },
  planDot:               { width: 10, height: 10, borderRadius: 5, backgroundColor: "#9c2f45", marginLeft: 12 },

  subscribeBtn:          { marginTop: 16, height: 56, borderRadius: 16, backgroundColor: "#9c2f45", justifyContent: "center", alignItems: "center" },
  subscribeBtnDisabled:  { opacity: 0.45 },
  subscribeBtnText:      { color: "#fff", fontSize: 17, fontWeight: "700" },

  stripeBanner:          { alignItems: "center", paddingVertical: 14 },
  stripeText:            { fontSize: 13, color: "#B8A082" },

  cancelBtn:             { marginTop: 32, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: "#9c2f45", justifyContent: "center", alignItems: "center" },
  cancelBtnText:         { fontSize: 15, fontWeight: "700", color: "#9c2f45" },
});
