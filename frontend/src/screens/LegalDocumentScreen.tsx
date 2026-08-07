import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../theme/appTheme';

type Mode = 'terms' | 'privacy';

interface Section {
  title: string;
  paragraphs: string[];
}

const TERMS: Section[] = [
  {
    title: '1. Objet',
    paragraphs: [
      "JeuTaime est une application sociale et de rencontre qui privilégie les échanges progressifs, les lettres, les salons, les mécaniques de découverte et les interactions ludiques avant le dévoilement complet des profils.",
      "Les présentes conditions encadrent l'accès et l'utilisation de l'application et de ses services.",
    ],
  },
  {
    title: '2. Conditions d’accès',
    paragraphs: [
      "L’inscription est réservée aux personnes majeures. L’utilisateur s’engage à fournir des informations sincères et à ne pas usurper l’identité d’un tiers.",
      "Les identifiants de connexion sont personnels. Toute utilisation du compte est réputée effectuée par son titulaire tant qu’un accès frauduleux n’a pas été signalé.",
    ],
  },
  {
    title: '3. Fonctionnement de JeuTaime',
    paragraphs: [
      "JeuTaime propose notamment la découverte de profils, les Sourires et Grimaces, le jeu des 3 questions, les lettres, les salons, la Bouteille à la mer, le Refuge, les offrandes, le Profil de la semaine, les notifications et différentes mécaniques sociales.",
      "Certaines fonctionnalités peuvent être limitées, débloquées progressivement, réservées à une formule payante ou dépendre d’un solde de pièces virtuelles.",
      "JeuTaime ne garantit ni rencontre, ni réponse, ni compatibilité entre utilisateurs.",
    ],
  },
  {
    title: '4. Comportement des utilisateurs',
    paragraphs: [
      "Sont interdits les comportements illégaux, menaçants, haineux, discriminatoires, harcelants, frauduleux ou portant atteinte à la sécurité d’autrui.",
      "Il est également interdit de publier ou transmettre des contenus illicites, de contourner les systèmes de sécurité, d’automatiser abusivement l’utilisation du service ou de tenter d’accéder aux données d’autres utilisateurs.",
      "Les fonctions de blocage et de signalement sont mises à disposition pour contribuer à la sécurité de la communauté.",
    ],
  },
  {
    title: '5. Contenus publiés',
    paragraphs: [
      "L’utilisateur reste responsable des textes, photos, messages et autres contenus qu’il transmet via JeuTaime. Il doit disposer des droits nécessaires pour les utiliser.",
      "Les contenus peuvent être modérés, masqués ou supprimés lorsqu’ils enfreignent les présentes conditions, la loi ou les règles de sécurité de l’application.",
    ],
  },
  {
    title: '6. Pièces, offres et Premium',
    paragraphs: [
      "Les pièces sont une unité virtuelle interne à JeuTaime. Elles ne constituent pas une monnaie, n’ont pas de valeur monétaire hors du service et ne peuvent pas être converties librement en argent réel.",
      "Les caractéristiques, tarifs, avantages et conditions des formules payantes doivent être affichés avant toute souscription. Les paiements en monnaie réelle ne doivent être considérés comme disponibles que lorsqu’un parcours de paiement officiellement activé est présenté dans l’application.",
    ],
  },
  {
    title: '7. Modération et suspension',
    paragraphs: [
      "JeuTaime peut prendre des mesures proportionnées en cas d’abus, notamment limitation de fonctionnalités, suspension ou bannissement du compte, conformément aux règles applicables et aux nécessités de sécurité.",
      "L’utilisateur peut également désactiver son compte depuis les paramètres et le réactiver ultérieurement en se reconnectant, ou demander sa suppression définitive via la fonction dédiée.",
    ],
  },
  {
    title: '8. Disponibilité du service',
    paragraphs: [
      "Le service peut évoluer, être interrompu temporairement pour maintenance, sécurité ou correction d’incidents. JeuTaime s’efforce de préserver la continuité du service sans pouvoir garantir une disponibilité permanente.",
    ],
  },
  {
    title: '9. Propriété intellectuelle',
    paragraphs: [
      "L’application, son identité visuelle, ses interfaces, textes éditoriaux, illustrations, logiciels et éléments graphiques restent protégés par les droits applicables, sous réserve des droits appartenant à leurs auteurs ou fournisseurs respectifs.",
    ],
  },
  {
    title: '10. Éditeur et droit applicable',
    paragraphs: [
      "À COMPLÉTER AVANT PUBLICATION : identité juridique de l’éditeur, forme sociale, adresse, SIRET/RCS le cas échéant, contact, directeur de la publication, hébergeur et juridiction/droit applicable.",
    ],
  },
];

const PRIVACY: Section[] = [
  {
    title: '1. Responsable du traitement',
    paragraphs: [
      "À COMPLÉTER AVANT PUBLICATION : identité et coordonnées du responsable du traitement JeuTaime, ainsi que l’adresse de contact dédiée aux demandes relatives aux données personnelles et, le cas échéant, les coordonnées du DPO.",
    ],
  },
  {
    title: '2. Données traitées',
    paragraphs: [
      "Selon les fonctionnalités utilisées, JeuTaime peut traiter les données de compte (email, identifiants techniques, dates de connexion), les données de profil (pseudo, date de naissance, genre, ville, préférences, biographie, centres d’intérêt, réponses aux questions, avatar et photos), ainsi que les réglages de confidentialité.",
      "L’application traite également les interactions nécessaires au service : Sourires/Grimaces, matchs, lettres, messages de salons, Bouteille à la mer, Refuge, offrandes, votes, blocages, signalements, notifications, tickets de support et historique lié aux pièces virtuelles.",
      "JeuTaime ne doit pas demander de géolocalisation précise lorsque la fonctionnalité concernée n’en a pas besoin. Le partage de la ville est contrôlable depuis les réglages de confidentialité.",
    ],
  },
  {
    title: '3. Finalités',
    paragraphs: [
      "Les données sont utilisées pour créer et administrer le compte, fournir les fonctionnalités sociales et de rencontre, afficher les profils compatibles, permettre les échanges, gérer les abonnements et pièces, personnaliser l’expérience, assurer la sécurité, prévenir les abus, traiter les signalements et fournir le support utilisateur.",
      "Des données techniques peuvent également être nécessaires à la sécurité, à la prévention de la fraude, au diagnostic d’incidents et au bon fonctionnement du service.",
    ],
  },
  {
    title: '4. Bases juridiques',
    paragraphs: [
      "Selon le traitement concerné, la base juridique peut être l’exécution du service demandé, le respect d’une obligation légale, l’intérêt légitime lié à la sécurité et à la prévention des abus, ou le consentement lorsqu’il est requis.",
      "Les traitements non nécessaires au fonctionnement du service, notamment certains usages publicitaires ou permissions sensibles, ne doivent être activés qu’avec une base juridique appropriée et, lorsque nécessaire, un consentement libre et révocable.",
    ],
  },
  {
    title: '5. Destinataires et sous-traitants',
    paragraphs: [
      "Les données sont accessibles aux personnes et systèmes qui en ont besoin pour fournir, sécuriser, administrer et modérer JeuTaime. Des prestataires techniques peuvent intervenir comme sous-traitants pour l’hébergement, les notifications, le stockage, le paiement ou d’autres fonctions nécessaires au service.",
      "À COMPLÉTER AVANT PUBLICATION : liste ou catégories définitives des prestataires, localisation des traitements et garanties applicables aux éventuels transferts hors Espace économique européen.",
    ],
  },
  {
    title: '6. Durées de conservation',
    paragraphs: [
      "Les données ne doivent être conservées que pendant une durée nécessaire aux finalités décrites, puis supprimées ou archivées lorsque la loi l’exige.",
      "À COMPLÉTER AVANT PUBLICATION : durées précises par catégorie (compte actif, compte supprimé, lettres/messages, transactions, sécurité, signalements, support, logs et sauvegardes).",
    ],
  },
  {
    title: '7. Tes choix de confidentialité',
    paragraphs: [
      "Depuis les paramètres, l’utilisateur peut notamment contrôler sa présence dans la découverte, le partage de sa ville et les notifications push lorsque ces réglages sont disponibles.",
      "Les fonctions de blocage permettent d’empêcher certaines interactions. Les signalements permettent d’alerter l’équipe de modération lorsqu’un comportement paraît contraire aux règles.",
    ],
  },
  {
    title: '8. Tes droits',
    paragraphs: [
      "Dans les conditions prévues par la réglementation applicable, l’utilisateur peut demander l’accès à ses données, leur rectification, leur effacement, la limitation de certains traitements, s’opposer à certains traitements et exercer son droit à la portabilité lorsque celui-ci s’applique.",
      "JeuTaime propose déjà un export des données personnelles depuis les paramètres ainsi qu’une fonction de suppression définitive du compte.",
      "À COMPLÉTER AVANT PUBLICATION : adresse de contact pour l’exercice des droits. L’utilisateur peut également introduire une réclamation auprès de la CNIL lorsqu’il estime que ses droits ne sont pas respectés.",
    ],
  },
  {
    title: '9. Sécurité',
    paragraphs: [
      "JeuTaime met en œuvre des mesures techniques et organisationnelles destinées à protéger les comptes et données contre les accès non autorisés, la perte, l’altération ou la divulgation. Aucun système ne pouvant garantir un risque nul, les mesures de sécurité sont réévaluées avec l’évolution du service.",
    ],
  },
  {
    title: '10. Mise à jour de la politique',
    paragraphs: [
      "Cette politique peut être mise à jour lorsque les fonctionnalités, prestataires ou obligations réglementaires évoluent. Une modification importante doit être portée à la connaissance des utilisateurs de manière appropriée.",
    ],
  },
];

export default function LegalDocumentScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isPrivacy = mode === 'privacy';
  const sections = isPrivacy ? PRIVACY : TERMS;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>JEUTAIME</Text>
          <Text style={styles.title}>{isPrivacy ? 'Politique de confidentialité' : "Conditions d’utilisation"}</Text>
          <Text style={styles.subtitle}>Version de préparation — 7 août 2026</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Document provisoire</Text>
          <Text style={styles.warningText}>
            Cette page structure les règles correspondant au fonctionnement actuel de JeuTaime. Les informations juridiques signalées « À COMPLÉTER » doivent impérativement être renseignées et relues avant toute publication commerciale.
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.paragraphs.map((paragraph, index) => (
              <Text key={`${section.title}-${index}`} style={styles.paragraph}>{paragraph}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_COLORS.background },
  header: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: APP_SPACING.md,
    paddingVertical: APP_SPACING.sm,
    backgroundColor: APP_COLORS.paper,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: APP_SPACING.sm },
  headerSpacer: { width: 52 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: APP_COLORS.muted },
  title: { fontSize: 20, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2, textAlign: 'center' },
  subtitle: { fontSize: 11, color: APP_COLORS.muted, marginTop: 3, textAlign: 'center' },
  content: { padding: APP_SPACING.md, paddingBottom: 48 },
  warningCard: {
    backgroundColor: APP_COLORS.paperSoft,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.md,
  },
  warningTitle: { fontSize: 14, fontWeight: '900', color: APP_COLORS.burgundy, marginBottom: 5 },
  warningText: { fontSize: 12, lineHeight: 18, color: APP_COLORS.muted },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.sm,
    ...(APP_SHADOWS.card ?? {}),
  },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: APP_COLORS.ink, marginBottom: 8 },
  paragraph: { fontSize: 12.5, lineHeight: 20, color: APP_COLORS.ink, marginBottom: 8 },
});
