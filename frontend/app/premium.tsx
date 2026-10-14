import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { AppBackButton } from "../src/components/AppBackButton";
import { getMyPremiumStatus, type PremiumStatusDTO } from "../src/api/premium";
import { APP_COLORS, APP_RADIUS, APP_SPACING } from "../src/theme/appTheme";

const BENEFITS = [
  "500 pièces offertes chaque mois",
  "Aucune publicité quotidienne obligatoire",
  "Photos visibles dès la sélection des profils",
  "10 correspondances simultanées (5 en Gratuit)",
  "5 bouteilles simultanées, envois et réponses compris (1 en Gratuit)",
  "Publicités récompensées facultatives : +10 pièces, jusqu’à 5 par jour",
];

export default function PremiumScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<PremiumStatusDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    getMyPremiumStatus()
      .then(setStatus)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppBackButton onPress={() => router.back()} />
        <Text style={styles.kicker}>JEUTAIME</Text>
        <Text style={styles.title}>JeuTaime Plus</Text>
        <Text style={styles.price}>5,99 € / mois</Text>
        <Text style={styles.subtitle}>Un seul abonnement, des avantages clairs.</Text>
        {loading ? <ActivityIndicator color={APP_COLORS.burgundy} /> : null}
        {error ? <Text style={styles.notice}>Statut de l’abonnement indisponible pour le moment.</Text> : null}
        {status?.active ? (
          <Text style={styles.active}>Ton abonnement est actif{status.premiumUntil ? ` jusqu’au ${new Date(status.premiumUntil).toLocaleDateString("fr-FR")}` : ""}.</Text>
        ) : null}
        <View style={styles.card}>
          {BENEFITS.map((benefit) => <Text key={benefit} style={styles.benefit}>• {benefit}</Text>)}
        </View>
        <View style={styles.card}>
          <Text style={styles.notice}>Les achats et la gestion des renouvellements seront activés après le raccordement d’un paiement vérifié. Aucun paiement ni débit de pièces n’est possible depuis cet écran.</Text>
        </View>
        <TouchableOpacity style={styles.back} onPress={() => router.push("/shop")}>
          <Text style={styles.backText}>Retour à la boutique</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_COLORS.background },
  content: { padding: APP_SPACING.lg, paddingBottom: 60 },
  kicker: { color: APP_COLORS.muted, fontSize: 10, letterSpacing: 2, textAlign: "center", marginTop: 22 },
  title: { color: APP_COLORS.ink, fontSize: 29, fontWeight: "900", textAlign: "center", marginTop: 8 },
  price: { color: APP_COLORS.burgundy, fontSize: 23, fontWeight: "800", textAlign: "center", marginTop: 10 },
  subtitle: { color: APP_COLORS.muted, fontSize: 13, textAlign: "center", marginTop: 8, marginBottom: 22 },
  card: { backgroundColor: APP_COLORS.paper, borderColor: APP_COLORS.border, borderWidth: 1, borderRadius: APP_RADIUS.lg, padding: 18, marginBottom: 18 },
  benefit: { color: APP_COLORS.ink, fontSize: 14, lineHeight: 22, marginBottom: 12 },
  notice: { color: APP_COLORS.muted, fontSize: 13, lineHeight: 20 },
  active: { color: APP_COLORS.success, textAlign: "center", fontWeight: "700", marginBottom: 16 },
  back: { padding: 15, borderRadius: APP_RADIUS.lg, alignItems: "center", backgroundColor: APP_COLORS.burgundy },
  backText: { color: APP_COLORS.white, fontWeight: "800" },
});
