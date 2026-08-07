import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { AppBackButton } from '../components/AppBackButton';
import {
  getOfferingsCatalog,
  type OfferingCatalogItemDTO,
} from '../api/offerings';
import {
  APP_COLORS,
  APP_RADIUS,
  APP_SHADOWS,
  APP_SPACING,
} from '../theme/appTheme';

interface ShopTileProps {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  onPress: () => void;
  badge?: string;
  emphasized?: boolean;
}

function ShopTile({
  icon,
  title,
  description,
  actionLabel,
  onPress,
  badge,
  emphasized = false,
}: ShopTileProps) {
  return (
    <TouchableOpacity
      style={[styles.tile, emphasized && styles.tileEmphasized]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View style={[styles.tileIconWrap, emphasized && styles.tileIconWrapEmphasized]}>
        <Text style={styles.tileIcon}>{icon}</Text>
      </View>
      <View style={styles.tileBody}>
        <View style={styles.tileTitleRow}>
          <Text style={styles.tileTitle}>{title}</Text>
          {badge ? <Text style={styles.tileBadge}>{badge}</Text> : null}
        </View>
        <Text style={styles.tileDescription}>{description}</Text>
        <Text style={[styles.tileAction, emphasized && styles.tileActionEmphasized]}>
          {actionLabel} →
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ShopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const coins = useStore((s) => s.coins);
  const currentUser = useStore((s) => s.currentUser);
  const loadWallet = useStore((s) => s.loadWallet);
  const [catalog, setCatalog] = useState<OfferingCatalogItemDTO[]>([]);

  useEffect(() => {
    void loadWallet();
    getOfferingsCatalog()
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, [loadWallet]);

  const catalogPreview = catalog.slice(0, 4);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>JEUTAIME</Text>
          <Text style={styles.title}>Boutique</Text>
          <Text style={styles.subtitle}>Pièces, Premium et petits plaisirs.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.balanceCard}
          onPress={() => router.push('/coins')}
          activeOpacity={0.8}
        >
          <View>
            <Text style={styles.balanceLabel}>Ton portefeuille</Text>
            <Text style={styles.balanceHint}>Voir le solde et l'historique</Text>
          </View>
          <View style={styles.balanceValueWrap}>
            <Text style={styles.balanceCoin}>🪙</Text>
            <Text style={styles.balanceValue}>{coins ?? 0}</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>À LA UNE</Text>

        <ShopTile
          icon="👑"
          title="Premium"
          description={
            currentUser?.isPremium
              ? 'Tes avantages Premium sont actifs. Consulte ton statut et ton échéance.'
              : 'Débloque davantage de confort et d’avantages dans JeuTaime.'
          }
          actionLabel={currentUser?.isPremium ? 'Gérer mon Premium' : 'Découvrir Premium'}
          onPress={() => router.push('/premium')}
          badge={currentUser?.isPremium ? 'ACTIF' : undefined}
          emphasized
        />

        <Text style={styles.sectionLabel}>MONNAIE & OBJETS</Text>

        <ShopTile
          icon="🪙"
          title="Pièces"
          description="Consulte ton solde, récupère ton bonus quotidien et retrouve toutes tes transactions."
          actionLabel="Ouvrir le portefeuille"
          onPress={() => router.push('/coins')}
        />

        <View style={styles.catalogCard}>
          <View style={styles.catalogHeader}>
            <View>
              <Text style={styles.catalogTitle}>🎁 Offrandes</Text>
              <Text style={styles.catalogSubtitle}>Aperçu du catalogue actuel</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/offerings')} activeOpacity={0.75}>
              <Text style={styles.catalogLink}>Reçues →</Text>
            </TouchableOpacity>
          </View>

          {catalogPreview.length > 0 ? (
            <View style={styles.catalogGrid}>
              {catalogPreview.map((item) => (
                <View key={item.id} style={styles.catalogItem}>
                  <Text style={styles.catalogEmoji}>{item.emoji}</Text>
                  <Text style={styles.catalogName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.catalogPrice}>{item.cost} 🪙</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.catalogEmpty}>Catalogue indisponible pour le moment.</Text>
          )}

          <Text style={styles.catalogNote}>
            Une offrande s’envoie depuis un profil ou un salon afin de conserver le bon destinataire.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💳</Text>
          <View style={styles.infoBody}>
            <Text style={styles.infoTitle}>Achats en euros</Text>
            <Text style={styles.infoText}>
              Le paiement par carte n’est pas encore activé. Aucun bouton de cette Boutique ne simule un achat réel.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  header: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: APP_SPACING.md,
    paddingVertical: APP_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.paper,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: APP_SPACING.sm,
  },
  headerSpacer: { width: 52 },
  kicker: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: APP_COLORS.muted,
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: APP_COLORS.ink,
  },
  subtitle: {
    fontSize: 12,
    color: APP_COLORS.muted,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: APP_SPACING.md,
    paddingTop: APP_SPACING.md,
  },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.lg,
    ...(APP_SHADOWS.card ?? {}),
  },
  balanceLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: APP_COLORS.ink,
  },
  balanceHint: {
    fontSize: 11,
    color: APP_COLORS.muted,
    marginTop: 3,
  },
  balanceValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  balanceCoin: { fontSize: 25 },
  balanceValue: {
    fontSize: 26,
    fontWeight: '900',
    color: APP_COLORS.ink,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: APP_COLORS.muted,
    marginBottom: APP_SPACING.sm,
    marginTop: 2,
  },
  tile: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.md,
    ...(APP_SHADOWS.card ?? {}),
  },
  tileEmphasized: {
    borderColor: APP_COLORS.burgundy,
  },
  tileIconWrap: {
    width: 52,
    height: 52,
    borderRadius: APP_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.paperSoft,
    marginRight: APP_SPACING.md,
  },
  tileIconWrapEmphasized: {
    backgroundColor: '#F3E5E7',
  },
  tileIcon: { fontSize: 27 },
  tileBody: { flex: 1 },
  tileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  tileTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: APP_COLORS.ink,
  },
  tileBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: APP_COLORS.burgundy,
    backgroundColor: '#F3E5E7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tileDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: APP_COLORS.muted,
  },
  tileAction: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '800',
    color: APP_COLORS.ink,
  },
  tileActionEmphasized: {
    color: APP_COLORS.burgundy,
  },
  catalogCard: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.md,
    ...(APP_SHADOWS.card ?? {}),
  },
  catalogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  catalogTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: APP_COLORS.ink,
  },
  catalogSubtitle: {
    fontSize: 11,
    color: APP_COLORS.muted,
    marginTop: 2,
  },
  catalogLink: {
    fontSize: 12,
    fontWeight: '800',
    color: APP_COLORS.burgundy,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  catalogItem: {
    width: '47%',
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.paperSoft,
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 10,
  },
  catalogEmoji: { fontSize: 27, marginBottom: 5 },
  catalogName: {
    fontSize: 12,
    fontWeight: '700',
    color: APP_COLORS.ink,
    textAlign: 'center',
  },
  catalogPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: APP_COLORS.muted,
    marginTop: 4,
  },
  catalogEmpty: {
    fontSize: 12,
    color: APP_COLORS.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  catalogNote: {
    fontSize: 11,
    lineHeight: 17,
    color: APP_COLORS.muted,
    marginTop: 12,
    fontStyle: 'italic',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.paperSoft,
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginTop: APP_SPACING.xs,
  },
  infoIcon: { fontSize: 22, marginRight: 12 },
  infoBody: { flex: 1 },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: APP_COLORS.ink,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: APP_COLORS.muted,
  },
});
