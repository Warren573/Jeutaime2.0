import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";
import {
  acceptMatch,
  blockMatch,
  breakMatch,
  getMatchQuestions,
  listLetters,
  listMatches,
  markLetterRead,
  relanceMatch,
  sendLetter,
  submitMatchAnswers,
  type LetterDTO,
  type MatchDTO,
  type MatchQuestionsDTO,
} from "../api/matches";

export default function TestCoreLettersScreen() {
  const router = useRouter();
  const currentUserId = useStore((state) => state.currentUser?.id);
  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [openedMatch, setOpenedMatch] = useState<MatchDTO | null>(null);
  const [letters, setLetters] = useState<LetterDTO[]>([]);
  const [lettersLoading, setLettersLoading] = useState(false);
  const [draft, setDraft] = useState("");

  const [questionsMatch, setQuestionsMatch] = useState<MatchDTO | null>(null);
  const [questions, setQuestions] = useState<MatchQuestionsDTO | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setMatches(await listMatches());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function refreshAfterAction() {
    await load();
    if (openedMatch) {
      const refreshed = (await listMatches()).find((m) => m.id === openedMatch.id) ?? null;
      setOpenedMatch(refreshed);
    }
  }

  async function runMatchAction(matchId: string, action: () => Promise<unknown>, failure: string) {
    setBusyId(matchId);
    setError(null);
    try {
      await action();
      await refreshAfterAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : failure);
    } finally {
      setBusyId(null);
    }
  }

  async function openLetters(match: MatchDTO) {
    setOpenedMatch(match);
    setLettersLoading(true);
    setError(null);
    try {
      const data = await listLetters(match.id);
      setLetters(data);
      const unreadIncoming = data.filter(
        (letter) => letter.toUserId === currentUserId && letter.status !== "READ",
      );
      await Promise.all(unreadIncoming.map((letter) => markLetterRead(letter.id).catch(() => undefined)));
      if (unreadIncoming.length > 0) await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les lettres");
    } finally {
      setLettersLoading(false);
    }
  }

  async function handleSend() {
    if (!openedMatch || !draft.trim()) return;
    setBusyId(openedMatch.id);
    try {
      await sendLetter(openedMatch.id, draft.trim());
      setDraft("");
      const data = await listLetters(openedMatch.id);
      setLetters(data);
      await load();
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Impossible d'envoyer la lettre");
    } finally {
      setBusyId(null);
    }
  }

  async function openQuestions(match: MatchDTO) {
    setQuestionsMatch(match);
    setQuestions(null);
    setAnswers({});
    setQuestionsLoading(true);
    try {
      setQuestions(await getMatchQuestions(match.id));
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Impossible de charger les questions");
      setQuestionsMatch(null);
    } finally {
      setQuestionsLoading(false);
    }
  }

  async function submitQuestions() {
    if (!questionsMatch || !questions) return;
    const payload = questions.questions.map((question) => ({
      profileQuestionId: question.profileQuestionId,
      answer: answers[question.profileQuestionId] ?? "",
    }));
    if (payload.some((item) => !item.answer.trim())) {
      Alert.alert("Réponses manquantes", "Répondez aux 3 questions avant de valider.");
      return;
    }
    setBusyId(questionsMatch.id);
    try {
      const result = await submitMatchAnswers(questionsMatch.id, payload);
      Alert.alert(
        "Résultat",
        result.matchBroken
          ? "Le match est annulé."
          : result.questionsValidated
            ? "Questions validées. Vous pouvez maintenant échanger des lettres."
            : result.waitingForOther
              ? "Réponses enregistrées. En attente de l'autre personne."
              : `Score : ${result.myScore}/3`,
      );
      setQuestionsMatch(null);
      setQuestions(null);
      setAnswers({});
      await load();
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Impossible d'envoyer les réponses");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              setLoading(true);
              void load();
            }}
          />
        }
      >
        <Text>Lettres</Text>

        {loading && matches.length === 0 ? <ActivityIndicator /> : null}
        {error ? <Text>{error}</Text> : null}
        {!loading && matches.length === 0 ? <Text>Aucune correspondance.</Text> : null}

        {matches.map((match) => {
          const name = match.otherProfile?.pseudo || match.otherUserId;
          const isInitiator = match.initiatorId === currentUserId;
          const totalLetters = match.letterCountA + match.letterCountB;
          const isBusy = busyId === match.id;

          return (
            <View key={match.id}>
              <Text>{name}</Text>
              <Text>Statut : {match.status}</Text>
              <Text>Questions validées : {match.questionsValidated ? "oui" : "non"}</Text>
              <Text>Lettres échangées : {totalLetters}</Text>
              <Text>Mon tour : {match.canSend ? "oui" : "non"}</Text>
              {match.canSendReason ? <Text>{match.canSendReason}</Text> : null}
              {match.hasUnreadIncomingLetter ? <Text>Lettre non lue</Text> : null}
              {match.photoUnlock ? (
                <Text>
                  Déblocage photo : niveau {match.photoUnlock.level} — {match.photoUnlock.progressPercent}%
                </Text>
              ) : null}

              <Button title="Voir le profil" onPress={() => router.push(`/profile/${match.otherUserId}` as never)} />

              {match.status === "PENDING" && !isInitiator ? (
                <Button
                  title={isBusy ? "Traitement..." : "Accepter le match"}
                  disabled={isBusy}
                  onPress={() =>
                    void runMatchAction(match.id, () => acceptMatch(match.id), "Impossible d'accepter le match")
                  }
                />
              ) : null}

              {match.status === "PENDING" && isInitiator ? <Text>En attente d'acceptation.</Text> : null}

              {match.status === "ACTIVE" && !match.questionsValidated ? (
                <Button title="Jeu des 3 questions" onPress={() => void openQuestions(match)} />
              ) : null}

              {match.status === "ACTIVE" && match.questionsValidated ? (
                <Button title="Ouvrir les lettres" onPress={() => void openLetters(match)} />
              ) : null}

              {match.status === "ACTIVE" && match.canRelance ? (
                <Button
                  title={isBusy ? "Traitement..." : "Relancer"}
                  disabled={isBusy}
                  onPress={() =>
                    void runMatchAction(match.id, () => relanceMatch(match.id), "Impossible de relancer")
                  }
                />
              ) : null}

              {match.status === "ACTIVE" || match.status === "PENDING" ? (
                <>
                  <Button
                    title="Rompre le match"
                    disabled={isBusy}
                    onPress={() =>
                      Alert.alert("Rompre le match", "Confirmer ?", [
                        { text: "Annuler", style: "cancel" },
                        {
                          text: "Rompre",
                          style: "destructive",
                          onPress: () =>
                            void runMatchAction(match.id, () => breakMatch(match.id), "Impossible de rompre le match"),
                        },
                      ])
                    }
                  />
                  <Button
                    title="Bloquer"
                    disabled={isBusy}
                    onPress={() =>
                      Alert.alert("Bloquer", "Bloquer cette personne ?", [
                        { text: "Annuler", style: "cancel" },
                        {
                          text: "Bloquer",
                          style: "destructive",
                          onPress: () =>
                            void runMatchAction(match.id, () => blockMatch(match.id), "Impossible de bloquer"),
                        },
                      ])
                    }
                  />
                </>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={openedMatch !== null} onRequestClose={() => setOpenedMatch(null)}>
        <ScrollView>
          <Text>Lettres avec {openedMatch?.otherProfile?.pseudo || openedMatch?.otherUserId}</Text>
          <Button title="Fermer" onPress={() => setOpenedMatch(null)} />
          {lettersLoading ? <ActivityIndicator /> : null}
          {letters.map((letter) => (
            <View key={letter.id}>
              <Text>{letter.fromUserId === currentUserId ? "Moi" : "Correspondant"}</Text>
              <Text>{letter.content}</Text>
              <Text>{new Date(letter.sentAt).toLocaleString()}</Text>
              <Text>{letter.status === "READ" ? "Lu" : "Envoyé"}</Text>
            </View>
          ))}

          {openedMatch?.status === "ACTIVE" && openedMatch.questionsValidated ? (
            <>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Écrire une lettre"
                multiline
                maxLength={500}
              />
              <Text>{draft.length}/500</Text>
              <Button
                title={busyId === openedMatch.id ? "Envoi..." : "Envoyer"}
                disabled={!openedMatch.canSend || !draft.trim() || busyId === openedMatch.id}
                onPress={() => void handleSend()}
              />
              {!openedMatch.canSend && openedMatch.canSendReason ? <Text>{openedMatch.canSendReason}</Text> : null}
            </>
          ) : null}
        </ScrollView>
      </Modal>

      <Modal visible={questionsMatch !== null} onRequestClose={() => setQuestionsMatch(null)}>
        <ScrollView>
          <Text>Jeu des 3 questions</Text>
          <Button title="Fermer" onPress={() => setQuestionsMatch(null)} />
          {questionsLoading ? <ActivityIndicator /> : null}
          {questions?.myStatus === "submitted" ? <Text>Réponses déjà envoyées.</Text> : null}
          {questions?.questions.map((question, index) => (
            <View key={question.profileQuestionId}>
              <Text>{index + 1}. {question.questionText}</Text>
              {question.options?.length ? (
                question.options.map((option) => (
                  <Button
                    key={option}
                    title={`${answers[question.profileQuestionId] === option ? "✓ " : ""}${option}`}
                    onPress={() =>
                      setAnswers((current) => ({ ...current, [question.profileQuestionId]: option }))
                    }
                  />
                ))
              ) : (
                <TextInput
                  placeholder="Votre réponse"
                  value={answers[question.profileQuestionId] ?? ""}
                  onChangeText={(value) =>
                    setAnswers((current) => ({ ...current, [question.profileQuestionId]: value }))
                  }
                />
              )}
            </View>
          ))}
          {questions && questions.myStatus !== "submitted" ? (
            <Button
              title={busyId === questionsMatch?.id ? "Validation..." : "Valider mes réponses"}
              disabled={busyId === questionsMatch?.id}
              onPress={() => void submitQuestions()}
            />
          ) : null}
        </ScrollView>
      </Modal>
    </>
  );
}
