import { describe, expect, it } from "vitest";
import { registerDeviceIfNeeded, type PushIdentity } from "../../../frontend/src/data/pushRegistration";

/**
 * Enregistrement de l'appareil pour le push : une écriture en base seulement quand elle est utile.
 * Cause démontrée dans les journaux Render du 26/11 : `register-device` à CHAQUE démarrage de l'interface (6 appels en une
 * minute à 12:57, 4 en 6 s à 08:43), même compte, même jeton.
 */
const ME: PushIdentity = { userId: "cmti-user-a", token: "ExponentPushToken[abcdefghij]", platform: "ios" };
const H = 3600_000;

function device(startAt = 1_000_000_000_000) {
  let stored: string | null = null;
  let clock = startAt;
  const serverCalls: Array<[string, string]> = [];
  let failNext = false;
  return {
    serverCalls,
    stored: () => stored,
    advance: (ms: number) => { clock += ms; },
    forgetLocal: () => { stored = null; }, // ce que fait la déconnexion / la connexion
    failNextRegistration: () => { failNext = true; },
    launch: (identity: PushIdentity = ME) => registerDeviceIfNeeded(identity, {
      readRecord: async () => stored,
      writeRecord: async (v) => { stored = v; },
      register: async (t, p) => { await Promise.resolve(); if (failNext) { failNext = false; throw new Error("réseau"); } serverCalls.push([t, p]); },
      now: () => clock,
    }),
  };
}

describe("registerDeviceIfNeeded", () => {
  it("6 démarrages en une minute : UN seul appel serveur (avant : 6)", async () => {
    const d = device();
    const outcomes: string[] = [];
    for (let i = 0; i < 6; i++) { outcomes.push(await d.launch()); d.advance(9_000); }
    expect(d.serverCalls).toHaveLength(1);
    expect(outcomes).toEqual(["registered", "skipped", "skipped", "skipped", "skipped", "skipped"]);
  });

  it("démarrages simultanés (plusieurs effets en même temps) : une seule écriture", async () => {
    const d = device();
    const all = await Promise.all([d.launch(), d.launch(), d.launch()]);
    expect(d.serverCalls).toHaveLength(1);
    expect(all.filter((o) => o === "registered")).toHaveLength(1);
    expect(all).toContain("in-flight");
  });

  it("après 24 h : une nouvelle écriture (rafraîchissement), puis plus rien", async () => {
    const d = device();
    await d.launch();
    d.advance(24 * H + 1);
    expect(await d.launch()).toBe("registered");
    expect(await d.launch()).toBe("skipped");
    expect(d.serverCalls).toHaveLength(2);
  });

  it("autre compte sur le même appareil, puis retour : une écriture à chaque changement RÉEL, pas à chaque démarrage", async () => {
    const d = device();
    await d.launch();
    await d.launch({ ...ME, userId: "compte-b" });
    await d.launch({ ...ME, userId: "compte-b" });
    await d.launch({ ...ME, userId: "compte-b" });
    await d.launch(ME);
    expect(d.serverCalls).toHaveLength(3);
  });

  it("jeton renouvelé par Expo, ou changement de plateforme : enregistré", async () => {
    const d = device();
    await d.launch();
    await d.launch({ ...ME, token: "ExponentPushToken[nouveaujeton1]" });
    await d.launch({ ...ME, token: "ExponentPushToken[nouveaujeton1]", platform: "android" });
    expect(d.serverCalls.map((c) => c[0])).toEqual(["ExponentPushToken[abcdefghij]", "ExponentPushToken[nouveaujeton1]", "ExponentPushToken[nouveaujeton1]"]);
  });

  it("déconnexion puis reconnexion du même compte (mémoire effacée) : l'appareil est réenregistré — aucun push perdu", async () => {
    const d = device();
    await d.launch();
    d.forgetLocal();
    d.advance(60_000);
    expect(await d.launch()).toBe("registered");
    expect(d.serverCalls).toHaveLength(2);
  });

  it("échec réseau : rien n'est mémorisé, l'erreur remonte, le démarrage suivant réessaie, puis c'est stable", async () => {
    const d = device();
    d.failNextRegistration();
    await expect(d.launch()).rejects.toThrow("réseau");
    expect(d.stored()).toBeNull();
    d.advance(5_000);
    expect(await d.launch()).toBe("registered");
    expect(await d.launch()).toBe("skipped");
    expect(d.serverCalls).toHaveLength(1);
  });

  it("échec d'écriture de la mémoire locale : l'enregistrement a quand même eu lieu, le démarrage suivant le refera (sans erreur)", async () => {
    const calls: string[] = [];
    const out = await registerDeviceIfNeeded(ME, {
      readRecord: async () => null,
      writeRecord: async () => { throw new Error("stockage plein"); },
      register: async (t) => { calls.push(t); },
      now: () => 1,
    });
    expect(out).toBe("registered");
    expect(calls).toHaveLength(1);
  });

  it("mémoire illisible : on enregistre (jamais de blocage)", async () => {
    const calls: string[] = [];
    for (const raw of ["pas du json", "{}", null]) {
      await registerDeviceIfNeeded({ ...ME, userId: `u-${String(raw)}` }, { readRecord: async () => raw, writeRecord: async () => undefined, register: async (t) => { calls.push(t); }, now: () => 1 });
    }
    expect(calls).toHaveLength(3);
  });

  it("identité inconnue (compte pas encore chargé) : on enregistre sans dédupliquer", async () => {
    const d = device();
    await d.launch({ ...ME, userId: "" });
    await d.launch({ ...ME, userId: "" });
    expect(d.serverCalls).toHaveLength(2);
  });
});
