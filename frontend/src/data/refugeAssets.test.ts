import * as fs from 'fs';
import * as path from 'path';
import { describe, test, expect } from '../test-support/assert';

const root = path.resolve(__dirname, '..', '..'); // frontend/
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(root, rel));
function pngSize(rel: string): [number, number] {
  const buf = fs.readFileSync(path.join(root, rel));
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${rel} n'est pas un PNG`);
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

const ANIMALS = ['HAMSTER', 'LAPIN', 'CHAT', 'CHIEN', 'RENARD', 'MANCHOT', 'IGUANE', 'PANDA', 'LICORNE', 'DRAGON', 'TOUCAN', 'PERROQUET'];
const STATES = ['assis', 'content', 'boude', 'dort', 'joue'];
const SPEC_FOODS: Record<string, string[]> = {
  CHIEN: ['food', 'meat'], CHAT: ['food', 'fish', 'sardines'], LAPIN: ['salad', 'carrot'], HAMSTER: ['seeds', 'carrot'],
  TOUCAN: ['seeds'], RENARD: ['meat', 'fish'], MANCHOT: ['fish', 'sardines'], IGUANE: ['salad', 'carrot'],
  LICORNE: ['salad', 'carrot'], PERROQUET: ['seeds'], PANDA: ['bamboo'], DRAGON: ['meat', 'fish'],
};

describe('PNG des animaux : 12 animaux × 5 états', () => {
  const source = read('src/data/refugeAnimalImages.ts');
  test('la liste des animaux est exactement celle du projet', () => {
    const list = read('src/data/refugeAnimals.ts');
    const block = list.slice(list.indexOf('REFUGE_ANIMALS'), list.indexOf('] as const'));
    const found = [...block.matchAll(/"([A-Z]+)"/g)].map((m) => m[1]);
    expect(found).toEqual(ANIMALS);
  });
  for (const animal of ANIMALS) {
    test(`${animal} : cinq états, fichiers réels, PNG 256×256`, () => {
      const block = source.match(new RegExp(`${animal}: \\{([^}]*)\\}`))?.[1] ?? '';
      for (const state of STATES) {
        const file = block.match(new RegExp(`${state}: require\\("\\.\\./\\.\\./([^"]+)"\\)`))?.[1];
        if (!file) throw new Error(`${animal}.${state} non référencé`);
        const expectedName = animal === 'DRAGON' && state === 'joue'
          ? 'dragon_joue_assis_256.png'
          : `${animal.toLowerCase()}_${state}_256.png`;
        expect(file).toBe(`assets/images/pets/${expectedName}`);
        expect(exists(file)).toBe(true);
        expect(pngSize(file)).toEqual([256, 256]);
      }
    });
  }
  test('aucun fichier supplémentaire non référencé dans le dossier des animaux', () => {
    const files = fs.readdirSync(path.join(root, 'assets/images/pets')).filter((f) => f.endsWith('.png'));
    expect(files.length).toBe(60);
    for (const f of files) expect(source.includes(f)).toBe(true);
  });
});

describe('PNG des gamelles et aliments', () => {
  const source = read('src/data/refugeBowls.ts');
  const FOODS = ['food', 'meat', 'fish', 'salad', 'carrot', 'bamboo', 'seeds', 'sardines'];
  test('neuf gamelles, fichiers réels, PNG transparents 512×512', () => {
    for (const key of ['empty', ...FOODS]) {
      const file = `assets/images/refuge/bowls/bowl-${key}.png`;
      expect(source.includes(`require('../../${file}')`)).toBe(true);
      expect(exists(file)).toBe(true);
      expect(pngSize(file)).toEqual([512, 512]);
    }
    const files = fs.readdirSync(path.join(root, 'assets/images/refuge/bowls')).filter((f) => f.endsWith('.png'));
    expect(files.length).toBe(9);
  });
  test('table des aliments identique à la liste validée (rien d’ajouté, rien d’oublié)', () => {
    const block = source.slice(source.indexOf('ANIMAL_FOODS'));
    for (const [animal, foods] of Object.entries(SPEC_FOODS)) {
      const m = block.match(new RegExp(`${animal}: \\[([^\\]]*)\\]`));
      expect(m === null).toBe(false);
      const parsed = (m![1] ?? '').split(',').map((s) => s.replace(/['"\s]/g, '')).filter(Boolean);
      expect(parsed).toEqual(foods);
    }
  });
  test('pas de poisson pour le chien, pas de viande pour le chat', () => {
    expect(SPEC_FOODS.CHIEN).not.toContain('fish');
    expect(SPEC_FOODS.CHAT).not.toContain('meat');
  });
  test('chaque aliment a un libellé français', () => {
    for (const food of FOODS) expect(source.includes(`${food}: '`)).toBe(true);
  });
});

describe('terminologie et éléments à ne pas réintroduire', () => {
  const screen = read('src/screens/RefugeSimplifiedScreen.tsx');
  const board = read('src/components/PersonalBoard.tsx');
  test('« actions » et non « gestes » dans les textes affichés du Refuge et de l’accueil', () => {
    for (const source of [screen, board]) expect(/\bgeste/i.test(source)).toBe(false);
  });
  test('titres selon le rôle réel : « Ton refuge » (compagnon) / « Ton compagnon » (parrain, marraine)', () => {
    expect(screen.includes("refuge.role === 'adoptant' ? 'Ton compagnon' : 'Ton refuge'")).toBe(true);
    expect(board.includes("isAnimal ? 'Ton refuge' : 'Ton compagnon'")).toBe(true);
    expect(/Mon refuge/.test(screen + board)).toBe(false);
    expect(/adopté le refuge|adopte le refuge/i.test(screen + board)).toBe(false);
  });
  test('parrain / marraine selon le genre réel, pas de formulation générique forcée', () => {
    expect(screen.includes("sponsorRole === 'parrain' ? 'ton parrain'")).toBe(true);
    expect(screen.includes("'marraine' ? 'ta marraine'")).toBe(true);
  });
  test('ficelles et trous de suspension des cartes d’actions non réintroduits', () => {
    expect(/styles\.string|styles\.hole/.test(screen)).toBe(false);
  });
  test('la gamelle n’apparaît jamais sur l’accueil', () => {
    expect(/refugeBowls|BOWL_IMAGES|bowl-/.test(board)).toBe(false);
  });
  test('le fond du Refuge n’est pas confondu avec l’écran de choix du rôle', () => {
    expect(screen.includes("refuge-watercolor-bg.png")).toBe(true);
    expect(screen.includes("refuge-bg.png")).toBe(false);
  });
});
