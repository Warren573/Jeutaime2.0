import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function DeleteAccountRequestPage() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Suppression de compte JeuTaime</Text>
      <Text style={styles.paragraph}>
        Vous pouvez demander la suppression de votre compte JeuTaime et des données associées.
      </Text>
      <Text style={styles.heading}>Depuis l'application</Text>
      <Text style={styles.paragraph}>
        Connectez-vous à votre compte, ouvrez Paramètres, puis sélectionnez « Supprimer mon compte ».
        Pour confirmer la demande, saisissez votre mot de passe et le mot SUPPRIMER.
      </Text>
      <Text style={styles.heading}>Sans accès à l'application</Text>
      <Text style={styles.paragraph}>
        Envoyez un e-mail à contact@jeutaime.app en indiquant que vous souhaitez supprimer votre
        compte JeuTaime. Indiquez l'adresse e-mail associée au compte afin que nous puissions
        vérifier votre demande en toute sécurité. N'envoyez jamais votre mot de passe.
      </Text>
      <Text
        style={styles.link}
        accessibilityRole="link"
        onPress={() => Linking.openURL('mailto:contact@jeutaime.app?subject=Demande%20de%20suppression%20de%20compte%20JeuTaime')}
      >
        Contacter contact@jeutaime.app
      </Text>
      <Text style={styles.heading}>Quelles données sont concernées ?</Text>
      <Text style={styles.paragraph}>
        La suppression dans l'application vise notamment le compte, le profil, les lettres,
        les correspondances, les photos et les interactions associées. Certaines informations
        peuvent devoir être conservées lorsque la loi l'impose, selon les durées décrites
        dans notre politique de confidentialité. Les délais de purge des sauvegardes restent
        à préciser dans cette politique.
      </Text>
      <Text style={styles.paragraph}>
        Politique de confidentialité : https://jeutaime.app/privacy-policy
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF8E7' },
  content: { padding: 24, paddingTop: 38, paddingBottom: 54, maxWidth: 760, width: '100%', alignSelf: 'center' },
  title: { fontSize: 25, fontWeight: '800', color: '#483627', marginBottom: 20 },
  heading: { fontSize: 18, fontWeight: '700', color: '#483627', marginTop: 18, marginBottom: 8 },
  paragraph: { fontSize: 15, lineHeight: 24, color: '#483627', marginBottom: 12 },
  link: { color: '#965522', textDecorationLine: 'underline', fontSize: 16, fontWeight: '700', marginBottom: 10 },
});
