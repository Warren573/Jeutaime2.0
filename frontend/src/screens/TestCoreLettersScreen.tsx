import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, Modal, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";
import { acceptMatch, blockMatch, breakMatch, getMatchQuestions, listLetters, listMatches, markLetterRead, relanceMatch, sendLetter, submitMatchAnswers, type LetterDTO, type MatchDTO, type MatchQuestionsDTO } from "../api/matches";
import { reportUser, type ReportReason } from "../api/profiles";
import { getSouvenirs, type SouvenirDTO } from "../api/souvenirs";

const REPORT_REASONS: { label: string; value: ReportReason }[] = [
  { label: "Harcèlement", value: "HARASSMENT" }, { label: "Spam", value: "SPAM" }, { label: "Faux profil", value: "FAKE" },
  { label: "Contenu inapproprié", value: "INAPPROPRIATE_CONTENT" }, { label: "Mineur", value: "MINOR" }, { label: "Autre", value: "OTHER" },
];

export default function TestCoreLettersScreen() {
  const router = useRouter();
  const currentUserId = useStore((state) => state.currentUser?.id);
  const [matches, setMatches] = useState<MatchDTO[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [busyId, setBusyId] = useState<string | null>(null);
  const [openedMatch, setOpenedMatch] = useState<MatchDTO | null>(null); const [letters, setLetters] = useState<LetterDTO[]>([]); const [lettersLoading, setLettersLoading] = useState(false); const [draft, setDraft] = useState("");
  const [questionsMatch, setQuestionsMatch] = useState<MatchDTO | null>(null); const [questions, setQuestions] = useState<MatchQuestionsDTO | null>(null); const [answers, setAnswers] = useState<Record<string, string>>({}); const [questionsLoading, setQuestionsLoading] = useState(false);
  const [souvenirs, setSouvenirs] = useState<SouvenirDTO[]>([]); const [souvenirsLoading, setSouvenirsLoading] = useState(false); const [showSouvenirs, setShowSouvenirs] = useState(false);

  const load = useCallback(async () => { setError(null); try { setMatches(await listMatches()); } catch (err) { setError(err instanceof Error ? err.message : "Erreur de chargement"); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);

  async function refreshOpenedMatch(matchId: string) { const refreshed = (await listMatches()).find((m) => m.id === matchId) ?? null; setOpenedMatch(refreshed); return refreshed; }
  async function refreshAfterAction() { await load(); if (openedMatch) await refreshOpenedMatch(openedMatch.id); }
  async function runMatchAction(matchId: string, action: () => Promise<unknown>, failure: string) { setBusyId(matchId); setError(null); try { await action(); await refreshAfterAction(); } catch (err) { setError(err instanceof Error ? err.message : failure); } finally { setBusyId(null); } }

  async function openLetters(match: MatchDTO) { setOpenedMatch(match); setLettersLoading(true); setError(null); try { const data = await listLetters(match.id); setLetters(data); const unread = data.filter((l) => l.toUserId === currentUserId && l.status !== "READ"); await Promise.all(unread.map((l) => markLetterRead(l.id).catch(() => undefined))); if (unread.length) { await load(); await refreshOpenedMatch(match.id); } } catch (err) { setError(err instanceof Error ? err.message : "Impossible de charger les lettres"); } finally { setLettersLoading(false); } }
  async function handleSend() { if (!openedMatch || !draft.trim()) return; const matchId = openedMatch.id; setBusyId(matchId); try { await sendLetter(matchId, draft.trim()); setDraft(""); setLetters(await listLetters(matchId)); await load(); await refreshOpenedMatch(matchId); } catch (err) { Alert.alert("Erreur", err instanceof Error ? err.message : "Impossible d'envoyer la lettre"); } finally { setBusyId(null); } }

  async function openQuestions(match: MatchDTO) { setQuestionsMatch(match); setQuestions(null); setAnswers({}); setQuestionsLoading(true); try { setQuestions(await getMatchQuestions(match.id)); } catch (err) { Alert.alert("Erreur", err instanceof Error ? err.message : "Impossible de charger les questions"); setQuestionsMatch(null); } finally { setQuestionsLoading(false); } }
  async function submitQuestions() { if (!questionsMatch || !questions) return; const payload = questions.questions.map((q) => ({ profileQuestionId: q.profileQuestionId, answer: answers[q.profileQuestionId] ?? "" })); if (payload.some((i) => !i.answer.trim())) { Alert.alert("Réponses manquantes", "Répondez aux 3 questions avant de valider."); return; } setBusyId(questionsMatch.id); try { const result = await submitMatchAnswers(questionsMatch.id, payload); Alert.alert("Résultat", result.matchBroken ? "Le match est annulé." : result.questionsValidated ? "Questions validées. Vous pouvez maintenant échanger des lettres." : result.waitingForOther ? "Réponses enregistrées. En attente de l'autre personne." : `Score : ${result.myScore}/3`); setQuestionsMatch(null); setQuestions(null); setAnswers({}); await load(); } catch (err) { Alert.alert("Erreur", err instanceof Error ? err.message : "Impossible d'envoyer les réponses"); } finally { setBusyId(null); } }

  async function openSouvenirs() { setShowSouvenirs(true); setSouvenirsLoading(true); try { setSouvenirs(await getSouvenirs()); } catch (err) { Alert.alert("Erreur", err instanceof Error ? err.message : "Impossible de charger les souvenirs"); } finally { setSouvenirsLoading(false); } }
  function handleReport(match: MatchDTO) { Alert.alert("Signaler", `Pourquoi signaler ${match.otherProfile?.pseudo || "cette personne"} ?`, [...REPORT_REASONS.map((reason) => ({ text: reason.label, onPress: () => void reportUser(match.otherUserId, reason.value).then(() => Alert.alert("Signalement envoyé")).catch((err) => Alert.alert("Erreur", err instanceof Error ? err.message : "Signalement impossible")) })), { text: "Annuler", style: "cancel" }]); }

  return <>
    <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); void load(); }} />}>
      <Text>Lettres</Text><Button title="Souvenirs" onPress={() => void openSouvenirs()} />
      {loading && matches.length === 0 ? <ActivityIndicator /> : null}{error ? <Text>{error}</Text> : null}{!loading && matches.length === 0 ? <Text>Aucune correspondance.</Text> : null}
      {matches.map((match) => { const name = match.otherProfile?.pseudo || match.otherUserId; const isInitiator = match.initiatorId === currentUserId; const totalLetters = match.letterCountA + match.letterCountB; const isBusy = busyId === match.id; return <View key={match.id}>
        <Text>{name}</Text><Text>Statut : {match.status}</Text><Text>Questions validées : {match.questionsValidated ? "oui" : "non"}</Text><Text>Lettres échangées : {totalLetters}</Text><Text>Mon tour : {match.canSend ? "oui" : "non"}</Text>{match.canSendReason ? <Text>{match.canSendReason}</Text> : null}{match.hasUnreadIncomingLetter ? <Text>Lettre non lue</Text> : null}{match.photoUnlock ? <Text>Déblocage photo : niveau {match.photoUnlock.level} — {match.photoUnlock.progressPercent}%</Text> : null}
        <Button title="Voir le profil" onPress={() => router.push(`/profile/${match.otherUserId}` as never)} />
        {match.status === "PENDING" && !isInitiator ? <Button title={isBusy ? "Traitement..." : "Accepter le match"} disabled={isBusy} onPress={() => void runMatchAction(match.id, () => acceptMatch(match.id), "Impossible d'accepter le match")} /> : null}
        {match.status === "PENDING" && isInitiator ? <Text>En attente d'acceptation.</Text> : null}
        {match.status === "ACTIVE" && !match.questionsValidated ? <Button title="Jeu des 3 questions" onPress={() => void openQuestions(match)} /> : null}
        {match.status === "ACTIVE" && match.questionsValidated ? <Button title="Ouvrir les lettres" onPress={() => void openLetters(match)} /> : null}
        {match.status === "ACTIVE" && match.canRelance ? <Button title={isBusy ? "Traitement..." : "Relancer"} disabled={isBusy} onPress={() => void runMatchAction(match.id, () => relanceMatch(match.id), "Impossible de relancer")} /> : null}
        <Button title="Signaler" onPress={() => handleReport(match)} />
        {match.status === "ACTIVE" || match.status === "PENDING" ? <><Button title="Rompre le match" disabled={isBusy} onPress={() => Alert.alert("Rompre le match", "Confirmer ?", [{ text: "Annuler", style: "cancel" }, { text: "Rompre", style: "destructive", onPress: () => void runMatchAction(match.id, () => breakMatch(match.id), "Impossible de rompre le match") }])} /><Button title="Bloquer" disabled={isBusy} onPress={() => Alert.alert("Bloquer", "Bloquer cette personne ?", [{ text: "Annuler", style: "cancel" }, { text: "Bloquer", style: "destructive", onPress: () => void runMatchAction(match.id, () => blockMatch(match.id), "Impossible de bloquer") }])} /></> : null}
      </View>; })}
    </ScrollView>

    <Modal visible={openedMatch !== null} onRequestClose={() => setOpenedMatch(null)}><ScrollView><Text>Lettres avec {openedMatch?.otherProfile?.pseudo || openedMatch?.otherUserId}</Text><Button title="Fermer" onPress={() => setOpenedMatch(null)} />{lettersLoading ? <ActivityIndicator /> : null}{letters.map((letter) => <View key={letter.id}><Text>{letter.fromUserId === currentUserId ? "Moi" : "Correspondant"}</Text><Text>{letter.content}</Text><Text>{new Date(letter.sentAt).toLocaleString()}</Text><Text>{letter.status === "READ" ? "Lu" : "Envoyé"}</Text></View>)}{openedMatch?.status === "ACTIVE" && openedMatch.questionsValidated ? <><TextInput value={draft} onChangeText={setDraft} placeholder="Écrire une lettre" multiline maxLength={500} /><Text>{draft.length}/500</Text><Button title={busyId === openedMatch.id ? "Envoi..." : "Envoyer"} disabled={!openedMatch.canSend || !draft.trim() || busyId === openedMatch.id} onPress={() => void handleSend()} />{!openedMatch.canSend && openedMatch.canSendReason ? <Text>{openedMatch.canSendReason}</Text> : null}</> : null}</ScrollView></Modal>

    <Modal visible={questionsMatch !== null} onRequestClose={() => setQuestionsMatch(null)}><ScrollView><Text>Jeu des 3 questions</Text><Button title="Fermer" onPress={() => setQuestionsMatch(null)} />{questionsLoading ? <ActivityIndicator /> : null}{questions?.myStatus === "submitted" ? <Text>Réponses déjà envoyées.</Text> : null}{questions?.questions.map((q, i) => <View key={q.profileQuestionId}><Text>{i + 1}. {q.questionText}</Text>{q.options?.length ? q.options.map((option) => <Button key={option} title={`${answers[q.profileQuestionId] === option ? "[X] " : "[ ] "}${option}`} onPress={() => setAnswers((a) => ({ ...a, [q.profileQuestionId]: option }))} />) : <TextInput placeholder="Votre réponse" value={answers[q.profileQuestionId] ?? ""} onChangeText={(value) => setAnswers((a) => ({ ...a, [q.profileQuestionId]: value }))} />}</View>)}{questions && questions.myStatus !== "submitted" ? <Button title={busyId === questionsMatch?.id ? "Validation..." : "Valider mes réponses"} disabled={busyId === questionsMatch?.id} onPress={() => void submitQuestions()} /> : null}</ScrollView></Modal>

    <Modal visible={showSouvenirs} onRequestClose={() => setShowSouvenirs(false)}><ScrollView><Text>Souvenirs</Text><Button title="Fermer" onPress={() => setShowSouvenirs(false)} />{souvenirsLoading ? <ActivityIndicator /> : null}{!souvenirsLoading && souvenirs.length === 0 ? <Text>Aucun souvenir.</Text> : null}{souvenirs.map((s) => <View key={s.id}><Text>{s.title}</Text><Text>{s.description}</Text><Text>{new Date(s.date).toLocaleString()}</Text><Text>Type : {s.type}</Text></View>)}</ScrollView></Modal>
  </>;
}
