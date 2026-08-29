import React from 'react';
import { Alert, Button, Platform, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';

interface SettingsItem { label: string; route?: string; action?: () => void; value?: string; }
interface SettingsSection { title: string; items: SettingsItem[]; }

export default function SettingsScreen() {
  const router = useRouter();
  const { currentUser, coins, points, logout } = useStore();
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const canDiscover = currentUser?.canDiscover;
  const hasQuestions = (currentUser?.apiQuestions?.length ?? 0) > 0;
  const nav = (route: string) => router.push(route as any);

  const doLogout = () => { logout().catch(() => {}); router.replace('/login'); };
  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && !window.confirm('Tu veux vraiment te déconnecter ?')) return;
      doLogout(); return;
    }
    Alert.alert('Déconnexion', 'Tu veux vraiment te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Oui', style: 'destructive', onPress: doLogout },
    ]);
  };

  const sections: SettingsSection[] = [
    { title: 'Mon profil', items: [
      ...(canDiscover === false ? [{ label: 'Compléter mon profil', route: '/create-profile' }] : []),
      ...(isAuthenticated && !hasQuestions ? [{ label: 'Mes 3 questions', route: '/setup-questions' }] : []),
      { label: 'Modifier mon profil', route: '/edit-profile' },
      { label: 'Personnaliser mon avatar', route: '/avatar-builder' },
      { label: 'Mes photos', route: '/my-photos' },
      { label: 'Préférences de rencontre', route: '/matching-preferences' },
      { label: 'Localisation', route: '/location' },
      { label: 'Vérification du profil', route: '/profile-verification' },
    ]},
    { title: 'Univers JeuTaime', items: [
      { label: 'Bouteille à la mer', route: '/bottles-main' }, { label: 'Refuge', route: '/refuge' },
      { label: 'Profil de la semaine', route: '/weekly-profile' }, { label: 'Journal', route: '/(tabs)/journal' },
      { label: 'Boîte à souvenirs', route: '/(tabs)/letters?tab=souvenirs' }, { label: 'Offrandes et magie', route: '/offerings' },
    ]},
    { title: 'Pièces et abonnement', items: [
      { label: 'Mes pièces', route: '/coins', value: String(coins) }, { label: 'Boutique', route: '/shop' },
      { label: 'Premium', route: '/premium' }, { label: 'Récompenses quotidiennes', route: '/daily-rewards' },
      { label: 'Historique gains / dépenses', route: '/coins-history' },
    ]},
    { title: 'Notifications', items: [ { label: 'Notifications', route: '/notifications' }, { label: 'Sons et vibrations', route: '/sounds' } ]},
    { title: 'Sécurité et confidentialité', items: [
      { label: 'Confidentialité du profil', route: '/privacy' }, { label: 'Blocages', route: '/blocked-users' },
      { label: 'Signalements', route: '/user-reports' }, { label: 'Mot de passe et connexion', route: '/password' },
      { label: 'Données personnelles', route: '/personal-data' }, { label: 'Se déconnecter', action: handleLogout },
      { label: 'Désactiver mon compte', route: '/deactivate' }, { label: 'Supprimer mon compte', route: '/delete-account' },
    ]},
    { title: 'Support', items: [
      { label: 'Aide', route: '/help' }, { label: 'FAQ', route: '/faq' }, { label: 'Signaler un bug', route: '/report-bug' },
      { label: 'Contacter le support', route: '/contact-support' }, { label: 'Règles du Jeu', route: '/game-rules' },
      { label: "Conditions d'utilisation", route: '/terms' }, { label: 'Politique de confidentialité', route: '/privacy-policy' },
    ]},
  ];

  return <ScrollView>
    <Text>Paramètres</Text>
    <Text>Utilisateur : {currentUser?.name || 'Joueur'}</Text>
    <Text>Ville : {(currentUser as any)?.city || 'Non renseignée'}</Text>
    <Text>Pièces : {coins}</Text><Text>Points : {points}</Text><Text>Matchs : {currentUser?.stats?.matchesCount || 0}</Text>
    {sections.map((section) => <View key={section.title}>
      <Text>{section.title}</Text>
      {section.items.map((item) => <View key={`${section.title}-${item.label}`}>
        {item.value != null && <Text>{item.label} : {item.value}</Text>}
        <Button title={item.value == null ? item.label : `Ouvrir ${item.label}`} onPress={() => item.action ? item.action() : item.route ? nav(item.route) : undefined} />
      </View>)}
    </View>)}
    <Text>JeuTaime v2.0.0</Text>
  </ScrollView>;
}
