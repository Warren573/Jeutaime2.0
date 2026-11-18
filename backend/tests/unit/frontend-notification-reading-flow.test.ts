import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NotificationType } from "@prisma/client";
import { createPushNavigator, resolvePushDestination } from "../../../frontend/src/utils/pushNavigation";
import { getNotificationTarget } from "../../../frontend/src/utils/notifications";
import { deriveReadingState, shouldLoadSpecificBottle } from "../../../frontend/src/utils/bottleReading";

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock("../../../frontend/src/api/client", () => ({ apiFetch }));
import { resolveBottleToRead } from "../../../frontend/src/api/bottles";

/**
 * Régression « la notification d'un nouveau message ouvre directement le formulaire de réponse ».
 * Attendu : l'écran de LECTURE d'une bouteille (/bottles-main : lettre reçue, « Écrire une réponse »,
 * « Relire notre correspondance »). Le formulaire (/bottles-discussion) ne s'ouvre qu'avec le bouton.
 * Parcours couverts : appui sur un push et appui dans « Mes notifications » (Journal).
 */
const FRONT = resolve(__dirname, "../../../frontend");
const ID = "cm1abcDEF_ghi-123";
const note = (type: string, meta: Record<string, unknown> | null) =>
  ({ id: "n", type, message: "m", meta, isRead: false, readAt: null, createdAt: new Date().toISOString() }) as never;

describe("cause racine : plus aucune notification n'ouvre le formulaire de réponse", () => {
  const ALL = Object.values(NotificationType) as string[];
  const SAMPLE_META = { bottleId: ID, matchId: "m-1", duelId: "d-1", salonId: "s-1", refugeSessionId: "r-1" };

  it("AUCUN type, par le push comme par la cloche, ne mène à /bottles-discussion", () => {
    for (const type of ALL) {
      const viaPush = resolvePushDestination({ type, ...SAMPLE_META }).route;
      const viaBell = getNotificationTarget(note(type, SAMPLE_META)) ?? "";
      expect(viaPush, `push ${type}`).not.toContain("bottles-discussion");
      expect(viaBell, `cloche ${type}`).not.toContain("bottles-discussion");
    }
  });

  it("le code des destinations ne référence jamais l'écran de réponse", () => {
    for (const file of ["src/utils/pushNavigation.ts", "src/utils/notifications.ts"]) {
      const code = readFileSync(resolve(FRONT, file), "utf8").split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");
      expect(code, file).not.toMatch(/bottles-discussion/);
    }
  });

  it("les écrans chargent la bouteille DEMANDÉE (paramètre de la notification), pas seulement la plus récente", () => {
    const main = readFileSync(resolve(FRONT, "src/screens/BottleMainScreen.tsx"), "utf8");
    expect(main).toMatch(/useLocalSearchParams<\{ bottleId\?: string \| string\[\] \}>\(\)/);
    expect(main).toMatch(/setState\(await resolveBottleToRead\(current, requestedBottleId\)\)/);
    expect(main).toMatch(/\}, \[requestedBottleId\]\);/); // rechargé si la bouteille demandée change
    const discussion = readFileSync(resolve(FRONT, "src/screens/BottleDiscussionScreen.tsx"), "utf8");
    expect(discussion).toMatch(/resolveBottleToRead\(await getCurrentBottle\(\), bottleId\)/);
  });

  it("le formulaire reste atteignable par le seul bouton « Écrire une réponse » de l'écran de lecture", () => {
    const main = readFileSync(resolve(FRONT, "src/screens/BottleMainScreen.tsx"), "utf8");
    expect(main).toMatch(/pathname: '\/bottles-discussion'[^)]*\)\}\s*>\s*<Text style=\{styles\.replyBtnText\}>Écrire une réponse/s);
    expect(main).toContain("Relire notre correspondance");
  });
});

describe("les deux parcours (push et Journal) : même écran de lecture, bouteilles ≠ lettres", () => {
  const BOTTLE_READING = ["BOTTLE_REPLY", "BOTTLE_REVEAL_REQUEST", "BOTTLE_REVEAL_REFUSED"];

  it.each(BOTTLE_READING)("%s → /bottles-main?bottleId=… partout", (type) => {
    const route = `/bottles-main?bottleId=${ID}`;
    expect(resolvePushDestination({ type, bottleId: ID }).route).toBe(route);
    expect(getNotificationTarget(note(type, { bottleId: ID }))).toBe(route);
  });

  it("bouteille sans identifiant valide : l'écran des bouteilles (jamais une route forgée)", () => {
    for (const type of BOTTLE_READING) {
      for (const bad of [undefined, null, "", "../x", "a/b", "x?y=1", "https://evil.example", "a".repeat(65), 5, {}]) {
        expect(resolvePushDestination({ type, bottleId: bad }).route, `${type} ${String(bad)}`).toBe("/bottles-main");
        expect(getNotificationTarget(note(type, { bottleId: bad })), `${type} ${String(bad)}`).toBe("/bottles-main");
      }
    }
  });

  it("lettre entre correspondants → fiche du match, jamais une bouteille ; et réciproquement", () => {
    expect(resolvePushDestination({ type: "LETTER_RECEIVED", matchId: "m-1", bottleId: ID }).route).toBe("/(tabs)/letters?matchId=m-1");
    expect(getNotificationTarget(note("LETTER_RECEIVED", { matchId: "m-1", bottleId: ID }))).toBe("/(tabs)/letters?matchId=m-1");
    // une lettre n'a pas de bouteille : sans matchId, jamais de repli vers l'écran des bouteilles
    expect(resolvePushDestination({ type: "LETTER_RECEIVED", bottleId: ID }).route).toBe("/notifications");
    expect(getNotificationTarget(note("LETTER_RECEIVED", { bottleId: ID }))).toBeNull();
    for (const type of BOTTLE_READING) {
      expect(resolvePushDestination({ type, matchId: "m-1", bottleId: ID }).route).not.toContain("match-profile");
      expect(getNotificationTarget(note(type, { matchId: "m-1", bottleId: ID }))).not.toContain("match-profile");
    }
  });

  it("dévoilement mutuel : la correspondance créée (match), conformément à la conception ; sinon l'écran des bouteilles", () => {
    expect(resolvePushDestination({ type: "BOTTLE_REVEAL_ACCEPTED", matchId: "m-1", bottleId: ID }).route).toBe("/(tabs)/letters?matchId=m-1");
    expect(getNotificationTarget(note("BOTTLE_REVEAL_ACCEPTED", { matchId: "m-1", bottleId: ID }))).toBe("/(tabs)/letters?matchId=m-1");
    expect(resolvePushDestination({ type: "BOTTLE_REVEAL_ACCEPTED", bottleId: ID }).route).toBe("/bottles-main");
  });

  it("push et cloche concordent pour chaque type de message (aucune divergence entre les deux parcours)", () => {
    for (const type of ["LETTER_RECEIVED", "MATCH_CREATED", "QUESTIONS_PASSED", "QUESTIONS_TURN", ...BOTTLE_READING, "BOTTLE_REVEAL_ACCEPTED", "DUEL_RECEIVED"]) {
      const push = resolvePushDestination({ type, matchId: "m-1", bottleId: ID, duelId: "d-1" }).route;
      const bell = getNotificationTarget(note(type, { matchId: "m-1", bottleId: ID, duelId: "d-1" }));
      if (bell !== null) expect(push, type).toBe(bell);
    }
  });
});

describe("application fermée, en arrière-plan ou ouverte : même destination de lecture", () => {
  let nav: ReturnType<typeof vi.fn>;
  const DEFAULT = "expo.modules.notifications.actions.DEFAULT";
  const resp = (id: string, data: unknown) => ({ actionIdentifier: DEFAULT, notification: { request: { identifier: id, content: { data } } } }) as never;
  const make = () => createPushNavigator({ navigate: nav as never, consume: vi.fn() as never, onDiscard: vi.fn() as never, defaultActionId: DEFAULT, now: () => 1_000_000 });
  const ready = (auth: "authenticated" | "unknown" | "unauthenticated" = "authenticated", navReady = true) => ({ auth, navReady }) as never;
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const PUSH = { type: "BOTTLE_REPLY", bottleId: ID };
  const READ = `/bottles-main?bottleId=${ID}`;

  beforeEach(() => { nav = vi.fn(); });

  it("application OUVERTE ou en ARRIÈRE-PLAN : l'appui ouvre la lecture, une seule fois", async () => {
    const n = make();
    n.update(ready());
    n.onResponse(resp("b1", PUSH));
    await tick();
    expect(nav).toHaveBeenCalledTimes(1);
    expect(nav).toHaveBeenCalledWith(READ);
  });

  it("application FERMÉE : attend la session et le routeur, puis ouvre la lecture (pas le formulaire)", async () => {
    const n = make();
    n.onResponse(resp("b2", PUSH));
    n.update(ready("unknown", false));
    await tick();
    expect(nav).not.toHaveBeenCalled();
    n.update(ready("authenticated", false));
    await tick();
    expect(nav).not.toHaveBeenCalled();
    n.update(ready("authenticated", true));
    await tick();
    expect(nav).toHaveBeenCalledTimes(1);
    expect(nav).toHaveBeenCalledWith(READ);
    for (const [route] of nav.mock.calls) expect(route).not.toContain("bottles-discussion");
  });

  it("aucune double navigation : écouteur ET dernière réponse pour le même appui", async () => {
    const n = make();
    n.update(ready("unknown", false));
    n.onResponse(resp("b3", PUSH));
    n.onResponse(resp("b3", PUSH));
    n.update(ready());
    await tick();
    expect(nav).toHaveBeenCalledTimes(1);
  });

  it("deux bouteilles distinctes : chaque appui ouvre SA bouteille", async () => {
    const n = make();
    n.update(ready());
    n.onResponse(resp("b4", { type: "BOTTLE_REPLY", bottleId: "bouteille-A" }));
    await tick();
    n.onResponse(resp("b5", { type: "BOTTLE_REPLY", bottleId: "bouteille-B" }));
    await tick();
    expect(nav.mock.calls.map((c) => c[0])).toEqual(["/bottles-main?bottleId=bouteille-A", "/bottles-main?bottleId=bouteille-B"]);
  });

  it("le push d'une lettre entre correspondants ouvre toujours la fiche du match (fonctionnement inchangé)", async () => {
    const n = make();
    n.update(ready());
    n.onResponse(resp("l1", { type: "LETTER_RECEIVED", matchId: "m-1" }));
    await tick();
    expect(nav).toHaveBeenCalledWith("/(tabs)/letters?matchId=m-1");
  });
});

describe("état de lecture d'une bouteille précise (mêmes règles que /bottles/current)", () => {
  const m = (id: string, isMine: boolean, source: "INITIAL_BOTTLE" | "ANONYMOUS_MESSAGE", content = `texte ${id}`) =>
    ({ id, content, createdAt: `2026-11-1${id.length}T10:00:00.000Z`, isMine, source }) as never;
  const derive = (messages: unknown[], ...rest: [status?: unknown]) => {
    const status = rest.length ? rest[0] : "ACCEPTED"; // `undefined` explicite = statut absent (≠ valeur par défaut)
    return deriveReadingState({ bottleId: ID, status, messages: messages as never, canCreateBottle: true });
  };

  it("expéditeur : la réponse de l'autre est la lettre reçue → on peut répondre, on peut rompre", () => {
    const s = derive([m("a", true, "INITIAL_BOTTLE"), m("bb", false, "ANONYMOUS_MESSAGE", "Bonjour !")])!;
    expect(s.latestLetter).toMatchObject({ id: "bb", content: "Bonjour !", isMine: false, source: "ANONYMOUS_MESSAGE" });
    expect(s).toMatchObject({ canReply: true, waitingForReply: false, canBreak: true, messageCount: 2, canCreateBottle: true });
    expect(s.bottle).toEqual({ id: ID, status: "ACCEPTED" });
  });

  it("répondant : le message de l'expéditeur est reçu ; la dernière lettre est la sienne → attente", () => {
    const received = derive([m("a", false, "INITIAL_BOTTLE"), m("bb", true, "ANONYMOUS_MESSAGE"), m("ccc", false, "ANONYMOUS_MESSAGE", "Et toi ?")])!;
    expect(received).toMatchObject({ canReply: true, waitingForReply: false, canBreak: true, messageCount: 3 });
    const waiting = derive([m("a", false, "INITIAL_BOTTLE"), m("bb", true, "ANONYMOUS_MESSAGE")])!;
    expect(waiting).toMatchObject({ canReply: false, waitingForReply: true, canBreak: true });
  });

  it("expéditeur sans réponse de l'autre : rien à rompre ; sa propre lettre → attente", () => {
    const s = derive([m("a", true, "INITIAL_BOTTLE")])!;
    expect(s).toMatchObject({ canReply: false, waitingForReply: true, canBreak: false, messageCount: 1 });
  });

  it("bouteille dévoilée lisible ; en mer, rompue, expirée, statut inconnu ou sans lettre : null (repli sur la courante)", () => {
    expect(derive([m("a", true, "INITIAL_BOTTLE")], "REVEALED")).not.toBeNull();
    for (const bad of ["FLOATING", "BROKEN", "EXPIRED", "", undefined, null, 7, "accepted"]) expect(derive([m("a", true, "INITIAL_BOTTLE")], bad), String(bad)).toBeNull();
    expect(derive([])).toBeNull();
    expect(derive(undefined as never)).toBeNull();
  });

  it("ANONYMAT : l'état ne contient que les champs attendus, aucune donnée sur l'autre personne", () => {
    const s = derive([{ ...(m("a", true, "INITIAL_BOTTLE") as object), senderId: "u-secret", acceptedById: "u-autre", pseudo: "Alice" }, m("bb", false, "ANONYMOUS_MESSAGE")])!;
    expect(Object.keys(s).sort()).toEqual(["bottle", "canBreak", "canCreateBottle", "canReply", "latestLetter", "messageCount", "waitingForReply"]);
    expect(Object.keys(s.latestLetter!).sort()).toEqual(["content", "createdAt", "id", "isMine", "source"]);
    expect(JSON.stringify(s)).not.toMatch(/u-secret|u-autre|Alice/);
  });

  it("shouldLoadSpecificBottle : seulement si un identifiant est demandé ET diffère de la bouteille courante", () => {
    const current = { bottle: { id: "cur", status: "ACCEPTED" } } as never;
    expect(shouldLoadSpecificBottle(undefined, current)).toBe(false);
    expect(shouldLoadSpecificBottle("", current)).toBe(false);
    expect(shouldLoadSpecificBottle(42, current)).toBe(false);
    expect(shouldLoadSpecificBottle("cur", current)).toBe(false);
    expect(shouldLoadSpecificBottle("autre", current)).toBe(true);
    expect(shouldLoadSpecificBottle("autre", { bottle: null } as never)).toBe(true);
  });
});

describe("resolveBottleToRead : la bonne bouteille, avec repli sûr", () => {
  const current = { bottle: { id: "courante", status: "ACCEPTED" }, latestLetter: { id: "c1", content: "Lettre courante", createdAt: "2026-11-12T10:00:00.000Z", isMine: false, source: "ANONYMOUS_MESSAGE" }, canReply: true, waitingForReply: false, canCreateBottle: false, canBreak: true, messageCount: 4 } as never;
  const messages = [
    { id: "x", content: "Premier message", createdAt: "2026-11-01T10:00:00.000Z", isMine: false, source: "INITIAL_BOTTLE" },
    { id: "y", content: "Dernière lettre reçue", createdAt: "2026-11-02T10:00:00.000Z", isMine: false, source: "ANONYMOUS_MESSAGE" },
  ];
  const mockApi = (impl: Record<string, () => unknown>) =>
    apiFetch.mockImplementation(async (path: string) => {
      for (const [suffix, fn] of Object.entries(impl)) if (path.endsWith(suffix)) return fn();
      throw new Error(`appel inattendu : ${path}`);
    });
  beforeEach(() => { apiFetch.mockReset(); });

  it("la bouteille demandée est la courante (ou aucune demandée) : aucun appel réseau, état inchangé", async () => {
    expect(await resolveBottleToRead(current, "courante")).toBe(current);
    expect(await resolveBottleToRead(current, undefined)).toBe(current);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("une AUTRE bouteille : sa dernière lettre reçue est lue, le quota vient de la courante", async () => {
    mockApi({ "/bottles/autre": () => ({ data: { id: "autre", status: "ACCEPTED" } }), "/bottles/autre/messages": () => ({ data: { messages } }) });
    const s = await resolveBottleToRead(current, "autre");
    expect(s.bottle).toEqual({ id: "autre", status: "ACCEPTED" });
    expect(s.latestLetter).toMatchObject({ id: "y", content: "Dernière lettre reçue", isMine: false });
    expect(s).toMatchObject({ canReply: true, waitingForReply: false, canCreateBottle: false });
    expect(s.latestLetter!.content).not.toBe("Lettre courante");
  });

  it("repli sur la bouteille courante : identifiant piégé, accès refusé, réseau, bouteille rompue, aucune lettre", async () => {
    for (const bad of ["../x", "a/b", "x?y=1", "a".repeat(65)]) expect(await resolveBottleToRead(current, bad), bad).toBe(current);
    expect(apiFetch).not.toHaveBeenCalled(); // jamais d'appel avec un identifiant douteux
    mockApi({ "/bottles/autre": () => { throw Object.assign(new Error("403"), { status: 403 }); }, "/bottles/autre/messages": () => ({ data: { messages } }) });
    expect(await resolveBottleToRead(current, "autre")).toBe(current);
    mockApi({ "/bottles/autre": () => ({ data: { id: "autre", status: "BROKEN" } }), "/bottles/autre/messages": () => ({ data: { messages } }) });
    expect(await resolveBottleToRead(current, "autre")).toBe(current);
    mockApi({ "/bottles/autre": () => ({ data: { id: "autre", status: "ACCEPTED" } }), "/bottles/autre/messages": () => ({ data: { messages: [] } }) });
    expect(await resolveBottleToRead(current, "autre")).toBe(current);
  });
});
