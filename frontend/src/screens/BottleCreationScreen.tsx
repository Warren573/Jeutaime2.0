import React, { useState } from 'react';
import { Button, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { createBottle, cancelPendingBottles } from '../api/bottles';

const MAX_MESSAGE_LENGTH = 1000;

export default function BottleCreationScreen() {
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const [targetGender, setTargetGender] = useState<'HOMME' | 'FEMME' | 'LES_DEUX'>('FEMME');
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(35);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [atLimit, setAtLimit] = useState(false);
  const [feedback, setFeedback] = useState<string>('');

  const send = async () => {
    setFeedback('');
    setAtLimit(false);
    if (!message.trim()) return setFeedback('Écris un message.');
    if (message.length > MAX_MESSAGE_LENGTH) return setFeedback(`Maximum ${MAX_MESSAGE_LENGTH} caractères.`);
    if (!currentUser?.city) return setFeedback("Complète ta ville dans ton profil avant d'envoyer une bouteille.");
    setIsLoading(true);
    try {
      await createBottle({ message: message.trim(), targetGender, ageMin, ageMax });
      setFeedback('Bouteille envoyée.');
      router.back();
    } catch (e: any) {
      setAtLimit(e?.status === 409);
      setFeedback(e?.message || "Erreur d'envoi.");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelPending = async () => {
    setIsCancelling(true);
    try {
      const cancelled = await cancelPendingBottles();
      setAtLimit(false);
      setFeedback(`${cancelled} bouteille(s) en attente annulée(s).`);
    } catch (e: any) {
      setFeedback(e?.message || "Impossible d'annuler les bouteilles en attente.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <ScrollView>
      <Text>Créer une bouteille</Text>
      <Text>Destinataire : {targetGender}</Text>
      <Button title="Homme" onPress={() => setTargetGender('HOMME')} />
      <Button title="Femme" onPress={() => setTargetGender('FEMME')} />
      <Button title="Les deux" onPress={() => setTargetGender('LES_DEUX')} />

      <Text>Âge minimum : {ageMin}</Text>
      <Button title="- âge minimum" onPress={() => setAgeMin((v) => Math.max(18, v - 1))} />
      <Button title="+ âge minimum" onPress={() => setAgeMin((v) => Math.min(ageMax, v + 1))} />

      <Text>Âge maximum : {ageMax}</Text>
      <Button title="- âge maximum" onPress={() => setAgeMax((v) => Math.max(ageMin, v - 1))} />
      <Button title="+ âge maximum" onPress={() => setAgeMax((v) => Math.min(99, v + 1))} />

      <Text>Message</Text>
      <TextInput multiline maxLength={MAX_MESSAGE_LENGTH} value={message} onChangeText={setMessage} placeholder="Écris ton message" />
      <Text>{message.length}/{MAX_MESSAGE_LENGTH}</Text>

      {feedback ? <Text>{feedback}</Text> : null}
      {atLimit && <Button title={isCancelling ? 'Annulation...' : 'Annuler mes bouteilles en attente'} disabled={isCancelling} onPress={cancelPending} />}
      <Button title={isLoading ? 'Envoi...' : 'Envoyer'} disabled={isLoading || !message.trim()} onPress={send} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
