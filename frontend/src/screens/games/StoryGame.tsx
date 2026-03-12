import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface Props {
  onEnd: (won: boolean, score: number) => void;
}

const storyStarters = [
  "Il était une fois, dans une forêt enchantée, un jeune aventurier qui découvrit",
  "Par une nuit de pleine lune, une mystérieuse lettre arriva à la porte de",
  "Au sommet de la plus haute tour du royaume, quelqu'un attendait",
  "Le vieux grimoire révéla un secret que personne n'avait jamais osé",
  "Dans les profondeurs de l'océan, une sirène rencontra",
];

const botContinuations = [
  "un coffre scintillant rempli de souvenirs oubliés.",
  "une créature magique aux yeux d'émeraude.",
  "un passage secret menant vers l'inconnu.",
  "des traces de pas qui menaient vers la montagne.",
  "un message codé gravé dans la pierre ancienne.",
  "une mélodie envoûtante venant de nulle part.",
  "le gardien du temps qui attendait depuis des siècles.",
  "une porte qui n'existait pas la veille.",
];

export default function StoryGame({ onEnd }: Props) {
  const [story, setStory] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const startGame = () => {
    const starter = storyStarters[Math.floor(Math.random() * storyStarters.length)];
    setStory([starter]);
    setIsMyTurn(true);
    setTurnCount(1);
    setGameStarted(true);
  };

  const submitSentence = () => {
    if (!currentInput.trim() || currentInput.length < 10) return;
    
    const newStory = [...story, currentInput.trim()];
    setStory(newStory);
    setCurrentInput('');
    setTurnCount(prev => prev + 1);
    setIsMyTurn(false);
    setWaiting(true);

    // Check if story is complete (6 turns = player contributed 3 times)
    if (turnCount >= 6) {
      setTimeout(() => {
        onEnd(true, 50);
      }, 1000);
      return;
    }

    // Simulate bot response
    setTimeout(() => {
      const botResponse = botContinuations[Math.floor(Math.random() * botContinuations.length)];
      setStory(prev => [...prev, botResponse]);
      setTurnCount(prev => prev + 1);
      setIsMyTurn(true);
      setWaiting(false);
    }, 2000);
  };

  if (!gameStarted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📖 Continue l'Histoire</Text>
        <View style={styles.rulesBox}>
          <Text style={styles.rulesTitle}>Comment jouer ?</Text>
          <Text style={styles.rule}>• Un début d'histoire vous est proposé</Text>
          <Text style={styles.rule}>• Ajoutez une phrase à votre tour</Text>
          <Text style={styles.rule}>• Alternez avec d'autres joueurs</Text>
          <Text style={styles.rule}>• Complétez 6 tours pour gagner!</Text>
          <Text style={styles.reward}>🎁 Récompense: 50 pièces</Text>
        </View>
        <TouchableOpacity style={styles.startBtn} onPress={startGame}>
          <Text style={styles.startText}>Commencer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.turnText}>Tour {turnCount}/6</Text>
        <Text style={styles.turnIndicator}>
          {isMyTurn ? '✍️ À vous!' : '⏳ En attente...'}
        </Text>
      </View>

      <ScrollView style={styles.storyContainer}>
        <Text style={styles.storyText}>
          {story.map((sentence, i) => (
            <Text key={i}>
              <Text style={i % 2 === 0 ? styles.otherText : styles.myText}>
                {sentence}{' '}
              </Text>
            </Text>
          ))}
        </Text>
      </ScrollView>

      {isMyTurn && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Continuez l'histoire (min 10 caractères)..."
            placeholderTextColor="#8B6F47"
            value={currentInput}
            onChangeText={setCurrentInput}
            multiline
            maxLength={200}
          />
          <View style={styles.inputFooter}>
            <Text style={styles.charCount}>{currentInput.length}/200</Text>
            <TouchableOpacity 
              style={[styles.submitBtn, currentInput.length < 10 && styles.submitBtnDisabled]}
              onPress={submitSentence}
              disabled={currentInput.length < 10}
            >
              <Text style={styles.submitText}>Envoyer →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {waiting && (
        <View style={styles.waitingBox}>
          <Text style={styles.waitingEmoji}>✨</Text>
          <Text style={styles.waitingText}>Un autre joueur écrit...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#3A2818', marginBottom: 16, textAlign: 'center' },
  rulesBox: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 20 },
  rulesTitle: { fontSize: 18, fontWeight: '700', color: '#3A2818', marginBottom: 10 },
  rule: { fontSize: 14, color: '#5D4037', marginBottom: 6 },
  reward: { fontSize: 14, color: '#DAA520', fontWeight: '600', marginTop: 10 },
  startBtn: { backgroundColor: '#9C27B0', paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25, alignSelf: 'center' },
  startText: { color: '#FFF', fontWeight: '700', fontSize: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  turnText: { fontSize: 16, fontWeight: '700', color: '#3A2818' },
  turnIndicator: { fontSize: 14, color: '#8B6F47' },
  storyContainer: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  storyText: { fontSize: 16, lineHeight: 26, color: '#3A2818' },
  myText: { color: '#E91E63', fontWeight: '500' },
  otherText: { color: '#3A2818' },
  inputContainer: { backgroundColor: '#FFF', borderRadius: 12, padding: 12 },
  input: { fontSize: 15, color: '#3A2818', minHeight: 60, textAlignVertical: 'top' },
  inputFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  charCount: { fontSize: 12, color: '#8B6F47' },
  submitBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  submitBtnDisabled: { backgroundColor: '#CCC' },
  submitText: { color: '#FFF', fontWeight: '700' },
  waitingBox: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, alignItems: 'center' },
  waitingEmoji: { fontSize: 40, marginBottom: 10 },
  waitingText: { fontSize: 16, color: '#8B6F47' },
});
