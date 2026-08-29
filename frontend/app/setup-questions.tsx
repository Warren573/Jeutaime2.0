import { useState } from 'react';
import { Alert, Button, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '../src/api/client';
import { useStore } from '../src/store/useStore';

type Question = {
  text: string;
  options: [string, string, string];
  correctAnswer: 0 | 1 | 2;
};

const EMPTY_QUESTION = (): Question => ({ text: '', options: ['', '', ''], correctAnswer: 0 });

function QuestionBlock({ index, question, onChange }: { index: number; question: Question; onChange: (next: Question) => void }) {
  return (
    <View>
      <Text>Question {index + 1}</Text>
      <TextInput
        value={question.text}
        onChangeText={(text) => onChange({ ...question, text })}
        placeholder="Écris ta question…"
      />
      {[0, 1, 2].map((i) => (
        <View key={i}>
          <TextInput
            value={question.options[i]}
            onChangeText={(text) => {
              const options = [...question.options] as [string, string, string];
              options[i] = text;
              onChange({ ...question, options });
            }}
            placeholder={`Réponse ${i + 1}`}
          />
          <Button
            title={question.correctAnswer === i ? `Bonne réponse : ${i + 1}` : `Choisir la réponse ${i + 1} comme bonne réponse`}
            onPress={() => onChange({ ...question, correctAnswer: i as 0 | 1 | 2 })}
          />
        </View>
      ))}
    </View>
  );
}

export default function SetupQuestionsScreen() {
  const router = useRouter();
  const { hydrateFromApi } = useStore();
  const [questions, setQuestions] = useState<Question[]>([EMPTY_QUESTION(), EMPTY_QUESTION(), EMPTY_QUESTION()]);
  const [isLoading, setIsLoading] = useState(false);

  const isReady = questions.every((q) => q.text.trim().length > 0 && q.options.every((o) => o.trim().length > 0));

  const handleSubmit = async () => {
    if (!isReady || isLoading) return;
    try {
      setIsLoading(true);
      await apiFetch('/profiles/me/questions', {
        method: 'PUT',
        body: JSON.stringify({
          questions: questions.map((q) => {
            const trimmedOptions = q.options.map((o) => o.trim());
            return {
              questionText: q.text.trim(),
              answer: trimmedOptions[q.correctAnswer],
              wrongAnswers: trimmedOptions.filter((_, i) => i !== q.correctAnswer),
            };
          }),
        }),
      });
      await hydrateFromApi();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de sauvegarder les questions');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Text>Tes 3 questions</Text>
      <Text>Écris tes 3 questions et 3 réponses par question. Choisis la bonne réponse pour chacune.</Text>
      {questions.map((question, index) => (
        <QuestionBlock
          key={index}
          index={index}
          question={question}
          onChange={(next) => {
            const copy = [...questions];
            copy[index] = next;
            setQuestions(copy);
          }}
        />
      ))}
      <Button
        title={isLoading ? 'Enregistrement...' : "Entrer dans l'univers"}
        onPress={() => void handleSubmit()}
        disabled={!isReady || isLoading}
      />
    </ScrollView>
  );
}
