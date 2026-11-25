import { describe, test, expect } from '../test-support/assert';
import { isSessionEnded, refugeErrorText } from './refugeSessionState';

describe('session terminée (fin dépassée)', () => {
  test('ACTIVE avec isActive=false : terminée (cas « jour 7 sur 7 » qui refuse tout)', () => {
    expect(isSessionEnded('ACTIVE', false)).toBe(true);
  });
  test('ACTIVE et active : jouable', () => {
    expect(isSessionEnded('ACTIVE', true)).toBe(false);
  });
  test('isActive inconnu (ancien serveur) : jamais bloquant', () => {
    expect(isSessionEnded('ACTIVE', null)).toBe(false);
    expect(isSessionEnded('ACTIVE', undefined)).toBe(false);
  });
  test('autres statuts : non concernés (attente, dévoilement, terminé…)', () => {
    for (const status of ['CREATION', 'WAITING_FOR_ADOPTANT', 'AWAITING_REVEAL_CONSENT', 'REVEALED', 'COMPLETED', 'ABANDONED']) {
      expect(isSessionEnded(status, false)).toBe(false);
    }
  });
});

describe('message d’erreur affiché', () => {
  test('rien à afficher sans erreur', () => {
    expect(refugeErrorText(null)).toBeNull();
    expect(refugeErrorText(undefined)).toBeNull();
  });
  test('les messages métier du serveur sont repris tels quels', () => {
    expect(refugeErrorText('Ce refuge a expiré')).toBe('Ce refuge a expiré');
    expect(refugeErrorText('Aliment incompatible avec cet animal')).toBe('Aliment incompatible avec cet animal');
    expect(refugeErrorText("L'Adopté n'a pas encore choisi ses actions pour le jour 7")).toBe("L'Adopté n'a pas encore choisi ses actions pour le jour 7");
  });
  test('un code HTTP brut devient une phrase lisible, avec le code conservé pour le diagnostic', () => {
    expect(refugeErrorText('HTTP 502')).toBe('Le serveur a refusé la demande (code 502).');
  });
  test('coupure réseau ou délai dépassé : message de connexion', () => {
    for (const m of ['Network request failed', 'Failed to fetch', 'Load failed', 'The operation timed out', 'AbortError: aborted']) {
      expect(refugeErrorText(m)).toBe('Connexion impossible. Vérifie ta connexion et réessaie.');
    }
  });
  test('message vide : jamais d’échec silencieux', () => {
    expect(refugeErrorText('')).toBe('La validation a échoué. Réessaie dans un instant.');
    expect(refugeErrorText('   ')).toBe('La validation a échoué. Réessaie dans un instant.');
  });
});

describe('l’écran du Refuge affiche réellement ces états (garde-fous sur la source)', () => {
  const fs = require('fs'); const path = require('path');
  const screen = fs.readFileSync(path.resolve(__dirname, '..', 'screens', 'RefugeSimplifiedScreen.tsx'), 'utf8') as string;
  const hook = fs.readFileSync(path.resolve(__dirname, '..', 'hooks', 'useRefugeSession.ts'), 'utf8') as string;
  test('le refus du serveur est rendu à l’écran (plus d’erreur silencieuse)', () => {
    expect(screen.includes('refugeErrorText(refuge.submitError ?? refuge.error)')).toBe(true);
    expect(screen.includes('styles.statusError')).toBe(true);
  });
  test('une session terminée désactive les actions et retire la validation', () => {
    expect(screen.includes('isSessionEnded(refuge.status, refuge.isActive)')).toBe(true);
    expect(/const disabled = isWaiting \|\| ended \|\|/.test(screen)).toBe(true);
  });
  test('le refus d’une validation n’est pas effacé par le rafraîchissement automatique', () => {
    expect((hook.match(/submitError: err\?\.message \|\| ""/g) ?? []).length).toBe(2);
    expect(hook.includes('clearSubmitError')).toBe(true);
  });
});
