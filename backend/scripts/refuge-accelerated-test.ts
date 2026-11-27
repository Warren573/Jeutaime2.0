/**
 * Test ACCÉLÉRÉ de fin d'aventure du Refuge — comptes de test UNIQUEMENT (testuser2 à testuser11@jeutaime.test).
 *
 * Lancé par le workflow manuel `.github/workflows/refuge-accelerated-test.yml` (jamais par l'application ni par un job).
 * Paramètres par variables d'environnement (jamais interpolés dans un shell) :
 *   RT_COMMAND   inventory | run
 *   RT_SCENARIO  S1 | S2 | S3            RT_STAGE   adopt | days-1-3 | days-4-6 | day-7 | fast-forward | decision | status
 *   RT_COMPANION e-mail du compagnon     RT_SPONSOR e-mail du parrain / de la marraine
 *   RT_SESSION_ID (étapes après adopt)   RT_DECISION none | scenario   RT_EXCLUDE / RT_PROTECT (listes séparées par des virgules)
 *   RT_MODE      simulate (défaut : AUCUNE écriture) | apply (exige RT_CONFIRM = la phrase exacte affichée par la simulation)
 *
 * Ce que le script NE FAIT JAMAIS : modifier une règle de production, la durée réelle d'un Refuge, l'horloge du serveur,
 * un compte hors liste, une autre session que celle ciblée ; supprimer ou réinitialiser quoi que ce soit.
 * Il rejoue chaque jour avec les VRAIES fonctions du service (pièces, points, notifications identiques à la production) et
 * « vieillit » la session ciblée en reculant son `startedAt` et ses propres horodatages de choix / réponses.
 */
import { prisma } from "../src/config/prisma";
import { RefugeService } from "../src/modules/refuge/refuge.service";
import {
  SCENARIOS, STAGES, STAGE_DAYS, SYMBOLS, confirmationPhrase, expectedOutcome, preconditionFailures, testAccountNumber, TEST_ACCOUNT_NUMBERS,
  type AccountFacts, type DayScript, type OpenSessionFact, type Scenario, type Stage,
} from "../src/modules/refuge/refuge.testkit";

const DAY = 86400000, HOUR = 3600000;
const OPEN_STATUSES = ["CREATION", "WAITING_FOR_ADOPTANT", "ACTIVE", "AWAITING_REVEAL_CONSENT"] as const;
const ACT = { action1: "NOURRIR", action2: "JOUER" } as const;

export interface RunOptions {
  scenario: Scenario["id"];
  stage: Stage;
  companionEmail: string;
  sponsorEmail: string;
  sessionId?: string;
  apply: boolean;
  confirm?: string;
  decision: "none" | "scenario";
  excludeEmails: string[];
  protectSessionIds: string[];
}

export interface Check { ok: boolean; label: string; detail?: string }
export interface RunResult { checks: Check[]; refused: string[]; sessionId?: string; confirmation: string; applied: boolean }

type Log = (line: string) => void;

// ============================================================
// Lecture (aucune écriture)
// ============================================================
async function loadUser(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, role: true, isBanned: true, profile: { select: { pseudo: true, discoveryActivityScore: true } }, wallet: { select: { coins: true } } },
  });
}
const facts = (u: { email: string; role: string; isBanned: boolean }): AccountFacts => ({ email: u.email, role: String(u.role), isBanned: u.isBanned });

async function openSessionsOf(userId: string): Promise<OpenSessionFact[]> {
  const rows = await prisma.refugeSession.findMany({
    where: { status: { in: [...OPEN_STATUSES] as never[] }, OR: [{ adopteId: userId }, { adoptantId: userId }] },
    select: { id: true, status: true, adopte: { select: { email: true } }, adoptant: { select: { email: true } } },
  });
  return rows.map((r) => ({ id: r.id, status: String(r.status), companionEmail: r.adopte.email, sponsorEmail: r.adoptant?.email ?? null }));
}

async function snapshot(userId: string, sessionId?: string) {
  const [wallet, profile, txns, notifs] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId }, select: { coins: true } }),
    prisma.profile.findUnique({ where: { userId }, select: { discoveryActivityScore: true } }),
    sessionId ? prisma.coinTransaction.findMany({ where: { walletId: userId, meta: { path: ["refugeSessionId"], equals: sessionId } }, select: { type: true, amount: true } }) : Promise.resolve([]),
    sessionId ? prisma.notification.findMany({ where: { userId, meta: { path: ["refugeSessionId"], equals: sessionId } }, select: { type: true } }) : Promise.resolve([]),
  ]);
  const byType = (rows: { type: unknown }[]) => rows.reduce<Record<string, number>>((m, r) => { const k = String(r.type); m[k] = (m[k] ?? 0) + 1; return m; }, {});
  return {
    coins: wallet?.coins ?? 0,
    score: profile?.discoveryActivityScore ?? 0,
    ledgerCoins: txns.reduce((s, t) => s + t.amount, 0),
    ledger: byType(txns),
    notifications: byType(notifs),
  };
}

// ============================================================
// Écriture : vieillissement de la SEULE session ciblée
// ============================================================
async function shiftTo(sessionId: string, startedAt: Date): Promise<void> {
  const cur = await prisma.refugeSession.findUniqueOrThrow({ where: { id: sessionId }, select: { startedAt: true } });
  const deltaMs = startedAt.getTime() - (cur.startedAt as Date).getTime();
  await prisma.$transaction([
    prisma.$executeRaw`UPDATE "RefugeDailyChoice" SET "submittedAt" = "submittedAt" + (${deltaMs} * interval '1 millisecond') WHERE "refugeSessionId" = ${sessionId}`,
    prisma.$executeRaw`UPDATE "RefugeGuess" SET "submittedAt" = "submittedAt" + (${deltaMs} * interval '1 millisecond') WHERE "refugeSessionId" = ${sessionId}`,
    prisma.refugeSession.update({ where: { id: sessionId }, data: { startedAt, endsAt: new Date(startedAt.getTime() + 7 * DAY) } }),
  ]);
}
/** Place la session au jour `day`, `hours` heures après le début de ce jour (heure du serveur inchangée). */
const placeAt = (sessionId: string, day: number, hours: number) => shiftTo(sessionId, new Date(Date.now() - (day - 1) * DAY - hours * HOUR));
/** 168 h + 1 h écoulées. */
const expire = (sessionId: string) => shiftTo(sessionId, new Date(Date.now() - 7 * DAY - HOUR));

function guessFor(kind: DayScript["guess"]) {
  if (kind === "none") return { guessedAction1: "LAVER", guessedAction2: "CARESSER" } as never;
  if (kind === "half") return { guessedAction1: "NOURRIR", guessedAction2: "LAVER", foodChoice: "food" } as never;
  return { guessedAction1: "NOURRIR", guessedAction2: "JOUER", foodChoice: "food" } as never;
}

async function playDay(sessionId: string, companionId: string, sponsorId: string, d: DayScript, log: Log) {
  const hour = d.companion ? (d.companionAtHour ?? 2) : 2;
  await placeAt(sessionId, d.day, hour);
  if (d.companion) await RefugeService.submitDailyChoice(sessionId, companionId, d.day, ACT as never);
  if (d.sponsor === "answer" && d.companion) await RefugeService.submitGuess(sessionId, sponsorId, d.day, guessFor(d.guess));
  // « consulter » = ouvrir le Refuge côté parrain / marraine : la lecture enregistre la consultation du jour (un bit).
  if (d.sponsor === "consult") await RefugeService.getRefugeSession(sessionId, sponsorId);
  log(`  jour ${d.day} : compagnon ${d.companion ? `valide (à ${d.companionAtHour ?? 2} h)` : "absent"}, parrain/marraine ${d.sponsor === "answer" ? `répond (${d.guess})` : d.sponsor === "consult" ? "consulte seulement" : "absent"}`);
}

// ============================================================
// Rapport (lecture)
// ============================================================
async function report(sessionId: string, companionId: string, sponsorId: string, scenario: Scenario, upToDay: number, afterFinal: boolean): Promise<{ checks: Check[]; lines: string[] }> {
  const checks: Check[] = [];
  const lines: string[] = [];
  const s = await prisma.refugeSession.findUniqueOrThrow({ where: { id: sessionId }, include: { dayResults: { orderBy: { dayNumber: "asc" } } } });
  const partial: Scenario = { ...scenario, days: scenario.days.filter((d) => d.day <= upToDay) };
  const exp = expectedOutcome(afterFinal ? scenario : partial);
  const [c, sp] = await Promise.all([snapshot(companionId, sessionId), snapshot(sponsorId, sessionId)]);
  const symbols = Array.from({ length: 7 }, (_, i) => {
    const r = s.dayResults.find((x) => x.dayNumber === i + 1);
    return r ? SYMBOLS[String(r.status)] ?? "?" : "🤍";
  });
  lines.push(`Session ${s.id} · ${s.status} · règles v${s.rulesVersion} · début ${s.startedAt?.toISOString()} · fin ${s.endsAt?.toISOString()}`);
  lines.push(`Calendrier : ${symbols.join(" ")}`);
  lines.push(`Compagnon : solde ${c.coins} · points ${c.score} · pièces de la session ${c.ledgerCoins} (${JSON.stringify(c.ledger)})`);
  lines.push(`Parrain   : solde ${sp.coins} · points ${sp.score} · pièces de la session ${sp.ledgerCoins} (${JSON.stringify(sp.ledger)})`);
  lines.push(`Notifications compagnon : ${JSON.stringify(c.notifications)}`);
  lines.push(`Notifications parrain   : ${JSON.stringify(sp.notifications)}`);

  const check = (ok: boolean, label: string, detail?: string) => checks.push({ ok, label, detail });
  const pointsSum = (role: "adopte" | "adoptant") => s.dayResults.reduce((n, r) => n + (role === "adopte" ? r.adopteScoreDelta : r.adoptantScoreDelta), 0);
  check(c.ledgerCoins === exp.companion.totalCoins - (afterFinal ? 0 : exp.companion.bonus), "pièces du compagnon conformes", `attendu ${exp.companion.totalCoins - (afterFinal ? 0 : exp.companion.bonus)}, constaté ${c.ledgerCoins}`);
  check(sp.ledgerCoins === exp.sponsor.totalCoins - (afterFinal ? 0 : exp.sponsor.bonus), "pièces du parrain/de la marraine conformes", `attendu ${exp.sponsor.totalCoins - (afterFinal ? 0 : exp.sponsor.bonus)}, constaté ${sp.ledgerCoins}`);
  check(pointsSum("adopte") === exp.companion.points, "points de classement du compagnon conformes", `attendu ${exp.companion.points}, constaté ${pointsSum("adopte")}`);
  check(pointsSum("adoptant") === exp.sponsor.points, "points de classement du parrain/de la marraine conformes", `attendu ${exp.sponsor.points}, constaté ${pointsSum("adoptant")}`);
  check([c, sp].every((x) => x.ledgerCoins >= 0), "aucune pénalité en pièces");
  check(afterFinal || ((c.notifications["REFUGE_REVEAL_PHASE"] ?? 0) === 0 && (sp.notifications["REFUGE_REVEAL_PHASE"] ?? 0) === 0), "aucun dévoilement annoncé avant 168 h");
  const doublon = (x: typeof c) => Object.entries(x.notifications).filter(([t, n]) => ["REFUGE_FINAL_REPORT", "REFUGE_ADOPTED", "REFUGE_ADOPTION_CONFIRMED"].includes(t) && n > 1);
  check(doublon(c).length === 0 && doublon(sp).length === 0, "aucune notification en double (adoption, bilan)");
  if (!afterFinal) {
    check(s.status === "ACTIVE" || s.status === "AWAITING_REVEAL_CONSENT" || s.status === "COMPLETED" || s.status === "REVEALED", "état de session cohérent");
    const early: any = await RefugeService.getRefugeSession(sessionId, companionId).catch(() => null);
    if (early && s.status === "ACTIVE") check(early.reveal?.available === false && early.finalConsentAvailable === false, "dévoilement NON proposé avant 168 h", `reveal.available=${early.reveal?.available}`);
  } else {
    const [cv, sv]: any[] = await Promise.all([RefugeService.getRefugeSession(sessionId, companionId), RefugeService.getRefugeSession(sessionId, sponsorId)]);
    for (const [label, v, e] of [["compagnon", cv, exp.companion], ["parrain/marraine", sv, exp.sponsor]] as const) {
      const r = v.finalReport;
      check(!!r && r.totalCoins === e.totalCoins && r.finalBonus === e.bonus && r.participationDays === e.participationDays && r.penaltyPoints === e.points && r.perfectDays === exp.perfectDays && r.correctActions === exp.correctActions,
        `bilan final du ${label} conforme`, r ? `${r.participationDays}/7 jours · ${r.perfectDays} parfaites · ${r.correctActions}/14 · jour +${r.dailyCoins} · bonus ${r.finalBonus} · total ${r.totalCoins} · points ${r.penaltyPoints}` : "bilan absent");
      check(JSON.stringify((r?.days ?? []).map((d: any) => d.symbol)) === JSON.stringify(exp.calendar), `calendrier du ${label} conforme`, (r?.days ?? []).map((d: any) => d.symbol).join(" "));
      lines.push(`Bilan ${label} : ${r ? `${r.participationDays}/7 · ${r.perfectDays} parfaites · ${r.correctActions}/14 · pièces ${r.dailyCoins}+${r.finalBonus}=${r.totalCoins} · points ${r.penaltyPoints}` : "—"}`);
    }
    check((c.notifications["REFUGE_FINAL_REPORT"] ?? 0) === 1 && (sp.notifications["REFUGE_FINAL_REPORT"] ?? 0) === 1, "UNE notification de fin par participant");
    check((c.notifications["REFUGE_REVEAL_PHASE"] ?? 0) === 0 && (sp.notifications["REFUGE_REVEAL_PHASE"] ?? 0) === 0 && (c.notifications["REFUGE_EXPIRED"] ?? 0) === 0, "ni dévoilement ni expiration annoncés en plus");
    check((c.ledger["REFUGE_FINAL_BONUS"] ?? 0) === (exp.companion.bonus > 0 ? 1 : 0) && (sp.ledger["REFUGE_FINAL_BONUS"] ?? 0) === (exp.sponsor.bonus > 0 ? 1 : 0), "bonus final versé une seule fois");
  }
  return { checks, lines };
}

// ============================================================
// Étape
// ============================================================
export async function runStage(o: RunOptions, log: Log = console.log): Promise<RunResult> {
  const scenario = SCENARIOS[o.scenario];
  const checks: Check[] = [];
  const confirmation = confirmationPhrase(o.scenario, o.stage, o.companionEmail, o.sponsorEmail);
  const refuse = (reasons: string[]): RunResult => ({ checks, refused: reasons, confirmation, applied: false });

  const [companion, sponsor] = await Promise.all([loadUser(o.companionEmail), loadUser(o.sponsorEmail)]);
  if (!companion || !sponsor) return refuse([`compte introuvable : ${!companion ? o.companionEmail : o.sponsorEmail}`]);
  const [openC, openS] = await Promise.all([openSessionsOf(companion.id), openSessionsOf(sponsor.id)]);
  const open = [...new Map([...openC, ...openS].map((s) => [s.id, s])).values()];
  const pairUsed = !!(await prisma.refugeSession.findFirst({ where: { adopteId: companion.id, adoptantId: sponsor.id }, select: { id: true } }));
  const targetRow = o.sessionId ? await prisma.refugeSession.findUnique({ where: { id: o.sessionId }, select: { id: true, status: true, rulesVersion: true, adopte: { select: { email: true } }, adoptant: { select: { email: true } } } }) : null;
  const reasons = preconditionFailures({
    stage: o.stage,
    companion: facts(companion),
    sponsor: facts(sponsor),
    excludedEmails: o.excludeEmails,
    protectedSessionIds: o.protectSessionIds,
    openSessions: open,
    pairAlreadyUsed: pairUsed,
    target: targetRow ? { id: targetRow.id, companionEmail: targetRow.adopte.email, sponsorEmail: targetRow.adoptant?.email ?? null, status: String(targetRow.status), rulesVersion: targetRow.rulesVersion } : null,
  });
  if (o.stage !== "adopt" && !o.sessionId) reasons.push("RT_SESSION_ID obligatoire (copié depuis le résumé de l'étape « adopt »)");
  if (reasons.length) return refuse(reasons);

  const sid = o.sessionId;
  const ok = (cond: boolean, label: string, detail?: string) => checks.push({ ok: cond, label, detail });
  log(`Scénario ${o.scenario} — ${scenario.title}`);
  log(`Étape ${o.stage} · compagnon ${companion.email} · parrain/marraine ${sponsor.email} · ${o.apply ? "EXÉCUTION RÉELLE" : "SIMULATION (aucune écriture)"}`);

  // État de la session pour les contrôles d'ordre des étapes.
  const state = sid
    ? await prisma.refugeSession.findUniqueOrThrow({ where: { id: sid }, select: { status: true, startedAt: true, dayResults: { select: { dayNumber: true } }, dailyChoices: { select: { dayNumber: true } } } })
    : null;
  const doneDays = new Set(state?.dayResults.map((r) => r.dayNumber));
  const choiceDays = new Set(state?.dailyChoices.map((r) => r.dayNumber));
  const days = STAGE_DAYS[o.stage];
  const planned: string[] = [];
  const order: string[] = [];

  switch (o.stage) {
    case "adopt":
      planned.push("le compagnon propose un Refuge (chat), le parrain/la marraine l'adopte → règles v2, notifications d'adoption");
      break;
    case "days-1-3": case "days-4-6": case "day-7": {
      if (state?.status !== "ACTIVE") order.push(`la session doit être ACTIVE (état : ${state?.status})`);
      const first = days![0]!;
      if (first > 1 && !(doneDays.has(first - 1))) order.push(`les jours précédents (jusqu'au jour ${first - 1}) ne sont pas encore joués/clôturés : lance d'abord l'étape précédente`);
      if (days!.some((d) => choiceDays.has(d) || doneDays.has(d))) order.push("cette étape a déjà été exécutée (des données existent pour ces jours)");
      for (const d of scenario.days.filter((x) => days!.includes(x.day))) {
        planned.push(`jour ${d.day} : compagnon ${d.companion ? `valide à ${d.companionAtHour ?? 2} h` : "absent"} · parrain/marraine ${d.sponsor === "answer" ? `répond (${d.guess})` : d.sponsor === "consult" ? "consulte" : "absent"}`);
      }
      planned.push(o.stage === "day-7" ? "la session est placée au jour 7 (aucun dévoilement possible : 168 h non écoulées)" : `la session est placée au début du jour ${days![days!.length - 1]! + 1} et les jours échus sont réglés`);
      break;
    }
    case "fast-forward":
      if (state?.status !== "ACTIVE") order.push(`la session doit être ACTIVE (état : ${state?.status})`);
      if (doneDays.size < 7) order.push(`les 7 jours doivent être réglés avant l'expiration (réglés : ${doneDays.size}/7) : lance les étapes précédentes`);
      planned.push("168 h + 1 h écoulées pour CETTE session : règlement final, bonus, notification de fin, dévoilement proposé");
      break;
    case "decision":
      if (state?.status !== "AWAITING_REVEAL_CONSENT") order.push(`la session doit attendre le dévoilement (état : ${state?.status}) : lance « fast-forward » d'abord`);
      planned.push(o.decision === "scenario" ? `décisions appliquées par le script : compagnon ${scenario.reveal.companion ?? "—"}, parrain/marraine ${scenario.reveal.sponsor ?? "—"}` : "aucune décision par le script : à faire sur l'iPhone (comptes de test)");
      break;
    case "status":
      planned.push("lecture seule : état de la session et vérifications");
      break;
  }
  if (order.length) return refuse(order);
  planned.forEach((p) => log(`  prévu → ${p}`));

  const writes = o.stage !== "status";
  if (!writes || !o.apply) {
    if (o.stage !== "status" && o.stage !== "adopt" && sid) {
      const upTo = days ? Math.max(...(STAGE_DAYS[o.stage] ?? [0])) : 7;
      log(`  valeurs attendues à la fin de cette étape : ${JSON.stringify(expectedOutcome({ ...scenario, days: scenario.days.filter((d) => d.day <= upTo) }))}`);
    }
    if (o.stage === "status" && sid) {
      const r = await report(sid, companion.id, sponsor.id, scenario, 7, state?.status !== "ACTIVE");
      r.lines.forEach((l) => log(l));
      r.checks.forEach((c) => checks.push(c));
    }
    if (writes) log(`  Pour exécuter réellement : mode apply + confirmation « ${confirmation} »`);
    return { checks, refused: [], sessionId: sid, confirmation, applied: false };
  }
  if (o.confirm !== confirmation) return refuse([`confirmation incorrecte : recopie exactement « ${confirmation} »`]);

  // ---------- Exécution réelle ----------
  const before = await Promise.all([snapshot(companion.id), snapshot(sponsor.id)]);
  log(`  avant : compagnon solde ${before[0].coins} / points ${before[0].score} · parrain solde ${before[1].coins} / points ${before[1].score}`);
  let sessionId = sid;
  if (o.stage === "adopt") {
    const proposal = await RefugeService.proposeAsAdopte(companion.id, { animalType: "CHAT", acceptedSexe: "HOMME_FEMME" } as never);
    await RefugeService.adoptRefuge(sponsor.id, proposal.id);
    sessionId = proposal.id;
    const created = await prisma.refugeSession.findUniqueOrThrow({ where: { id: proposal.id }, select: { rulesVersion: true, status: true } });
    ok(created.rulesVersion === 2 && created.status === "ACTIVE", "session créée en règles v2, active", `v${created.rulesVersion} ${created.status}`);
    log(`  SESSION CRÉÉE : ${proposal.id}  → à recopier dans RT_SESSION_ID pour les étapes suivantes`);
  } else if (days) {
    for (const d of scenario.days.filter((x) => days.includes(x.day))) await playDay(sessionId!, companion.id, sponsor.id, d, log);
    if (o.stage === "day-7") await placeAt(sessionId!, 7, 3);
    else { await placeAt(sessionId!, days[days.length - 1]! + 1, 0.5); await RefugeService.closePastDays(sessionId!); }
  } else if (o.stage === "fast-forward") {
    await expire(sessionId!);
    await RefugeService.getRefugeSession(sessionId!, companion.id); // la lecture déclenche la clôture finale (la tâche horaire ferait de même)
    await new Promise((r) => setTimeout(r, 1500)); // laisse partir les notifications
  } else if (o.stage === "decision" && o.decision === "scenario") {
    if (scenario.reveal.companion) await RefugeService.submitRevealConsent(sessionId!, companion.id, scenario.reveal.companion);
    if (scenario.reveal.sponsor) await RefugeService.submitRevealConsent(sessionId!, sponsor.id, scenario.reveal.sponsor);
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (sessionId && o.stage !== "adopt") {
    const upTo = days ? Math.max(...days) : 7;
    const r = await report(sessionId, companion.id, sponsor.id, scenario, upTo, o.stage === "fast-forward" || o.stage === "decision");
    r.lines.forEach((l) => log(l));
    r.checks.forEach((c) => checks.push(c));
    if (o.stage === "decision") {
      const active: any = await RefugeService.getActiveRefugeSession(companion.id).catch(() => null);
      const refused = scenario.reveal.companion === "REFUSE" || scenario.reveal.sponsor === "REFUSE";
      if (o.decision === "scenario") {
        const fin = await prisma.refugeSession.findUniqueOrThrow({ where: { id: sessionId }, select: { status: true } });
        ok(fin.status === (refused ? "COMPLETED" : "REVEALED"), `état final ${refused ? "COMPLETED (refus)" : "REVEALED (accord mutuel)"}`, String(fin.status));
        if (refused) ok(!active || active.id !== sessionId, "le Refuge actif a disparu après la clôture (refus)");
        const post = await snapshot(companion.id, sessionId);
        ok(post.ledgerCoins === expectedOutcome(scenario).companion.totalCoins, "récompenses conservées après la décision", `pièces de la session : ${post.ledgerCoins}`);
      }
    }
  }
  const after = await Promise.all([snapshot(companion.id), snapshot(sponsor.id)]);
  log(`  après : compagnon solde ${after[0].coins} (${after[0].coins - before[0].coins >= 0 ? "+" : ""}${after[0].coins - before[0].coins}) / points ${after[0].score} (${after[0].score - before[0].score}) · parrain solde ${after[1].coins} (${after[1].coins - before[1].coins >= 0 ? "+" : ""}${after[1].coins - before[1].coins}) / points ${after[1].score} (${after[1].score - before[1].score})`);
  return { checks, refused: [], sessionId, confirmation, applied: true };
}

// ============================================================
// Inventaire (lecture seule)
// ============================================================
export async function inventory(log: Log = console.log): Promise<void> {
  const emails = TEST_ACCOUNT_NUMBERS.map((n) => `testuser${n}@jeutaime.test`);
  const users = await prisma.user.findMany({
    where: { email: { in: emails, mode: "insensitive" } },
    select: { id: true, email: true, role: true, isBanned: true, wallet: { select: { coins: true } }, profile: { select: { pseudo: true, discoveryActivityScore: true } }, pushTokens: { select: { id: true } } },
    orderBy: { email: "asc" },
  });
  const sessions = await prisma.refugeSession.findMany({
    where: { OR: [{ adopteId: { in: users.map((u) => u.id) } }, { adoptantId: { in: users.map((u) => u.id) } }] },
    select: { id: true, status: true, rulesVersion: true, createdAt: true, startedAt: true, endsAt: true, adopteId: true, adoptantId: true },
    orderBy: { createdAt: "asc" },
  });
  const emailOf = new Map(users.map((u) => [u.id, u.email.replace("@jeutaime.test", "")]));
  log("== Comptes de test (testuser2 à testuser11) ==");
  const missing = emails.filter((e) => !users.some((u) => u.email.toLowerCase() === e));
  for (const u of users) log(`${u.email} · id ${u.id} · rôle ${u.role}${u.isBanned ? " · SUSPENDU" : ""} · pseudo ${u.profile?.pseudo ?? "—"} · pièces ${u.wallet?.coins ?? 0} · points ${u.profile?.discoveryActivityScore ?? 0} · appareils ${u.pushTokens.length}`);
  if (missing.length) log(`Introuvables : ${missing.join(", ")}`);
  const busy = new Set<string>();
  log("\n== Refuges impliquant ces comptes ==");
  for (const s of sessions) {
    const open = (OPEN_STATUSES as readonly string[]).includes(String(s.status));
    if (open) { busy.add(s.adopteId); if (s.adoptantId) busy.add(s.adoptantId); }
    log(`${s.id} · ${s.status}${open ? " · EN COURS — À PRÉSERVER" : ""} · v${s.rulesVersion} · compagnon ${emailOf.get(s.adopteId) ?? "?"} → parrain ${s.adoptantId ? emailOf.get(s.adoptantId) ?? "?" : "—"} · créé ${s.createdAt.toISOString()}`);
  }
  const usable = users.filter((u) => String(u.role) === "USER" && !u.isBanned && !busy.has(u.id) && testAccountNumber(u.email) !== null);
  log("\n== Comptes exclus ==");
  for (const u of users) {
    const why = [String(u.role) !== "USER" ? `rôle ${u.role}` : "", u.isBanned ? "suspendu" : "", busy.has(u.id) ? "Refuge en cours" : ""].filter(Boolean);
    if (why.length) log(`${u.email} : ${why.join(", ")}`);
  }
  const used = new Set(sessions.filter((s) => s.adoptantId).map((s) => `${s.adopteId}>${s.adoptantId}`));
  const free: Array<[string, string]> = [];
  for (const a of usable) for (const b of usable) if (a.id !== b.id && !used.has(`${a.id}>${b.id}`)) free.push([a.email, b.email]);
  log(`\n== Couples (compagnon → parrain) libres : ${free.length} ==`);
  // Proposition : trois couples SANS compte en commun, pour que les scénarios restent indépendants.
  const taken = new Set<string>();
  const picks: Array<[string, string]> = [];
  for (const [a, b] of free) { if (picks.length < 3 && !taken.has(a) && !taken.has(b)) { picks.push([a, b]); taken.add(a); taken.add(b); } }
  picks.forEach(([a, b], i) => log(`Proposition S${i + 1} : compagnon ${a} → parrain/marraine ${b}`));
  if (picks.length < 3) log("⚠️ Moins de trois couples indépendants : on peut réutiliser un compte en enchaînant les scénarios (un seul Refuge ouvert par compte).");
}

// ============================================================
// Point d'entrée (workflow)
// ============================================================
function list(v: string | undefined): string[] { return (v ?? "").split(",").map((s) => s.trim()).filter(Boolean); }

async function main(): Promise<void> {
  const out: string[] = [];
  const log: Log = (l) => { out.push(l); console.log(l); };
  let failed = false;
  try {
    if (process.env["RT_COMMAND"] === "inventory") await inventory(log);
    else {
      const scenario = (process.env["RT_SCENARIO"] ?? "") as Scenario["id"];
      const stage = (process.env["RT_STAGE"] ?? "") as Stage;
      if (!(scenario in SCENARIOS) || !STAGES.includes(stage)) throw new Error("RT_SCENARIO (S1|S2|S3) et RT_STAGE valides sont obligatoires");
      const res = await runStage({
        scenario, stage,
        companionEmail: process.env["RT_COMPANION"] ?? "", sponsorEmail: process.env["RT_SPONSOR"] ?? "",
        sessionId: process.env["RT_SESSION_ID"] || undefined,
        apply: process.env["RT_MODE"] === "apply", confirm: process.env["RT_CONFIRM"],
        decision: process.env["RT_DECISION"] === "scenario" ? "scenario" : "none",
        excludeEmails: list(process.env["RT_EXCLUDE"]), protectSessionIds: list(process.env["RT_PROTECT"]),
      }, log);
      if (res.refused.length) { failed = true; log("\n⛔ ÉTAPE REFUSÉE — aucune écriture :"); res.refused.forEach((r) => log(`  - ${r}`)); }
      else {
        log("\nContrôles :");
        res.checks.forEach((c) => { log(`  ${c.ok ? "✅" : "❌"} ${c.label}${c.detail ? ` — ${c.detail}` : ""}`); if (!c.ok) failed = true; });
        if (res.applied && res.sessionId) log(`\nSESSION_ID=${res.sessionId}`);
      }
    }
  } catch (err) {
    failed = true;
    log(`Erreur : ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    const summary = process.env["GITHUB_STEP_SUMMARY"];
    if (summary) { const fs = await import("node:fs"); fs.appendFileSync(summary, "```\n" + out.join("\n") + "\n```\n"); }
    await prisma.$disconnect();
  }
  process.exit(failed ? 1 : 0);
}

if (require.main === module) void main();
