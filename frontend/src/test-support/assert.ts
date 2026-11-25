/** Assertions sans dépendance (le frontend n'embarque pas de framework de test). */
let passed = 0;
let failed = 0;
const failures: string[] = [];
const path: string[] = [];

export function describe(name: string, run: () => void): void {
  path.push(name);
  try { run(); } finally { path.pop(); }
}
export function test(name: string, run: () => void): void {
  try { run(); passed++; } catch (error) {
    failed++;
    failures.push(`${[...path, name].join(' > ')} : ${error instanceof Error ? error.message : String(error)}`);
  }
}
export const it = test;

const show = (v: unknown): string => { try { return JSON.stringify(v); } catch { return String(v); } };
export function expect(actual: unknown) {
  const fail = (msg: string) => { throw new Error(msg); };
  const api = {
    toBe(expected: unknown) { if (!Object.is(actual, expected)) fail(`attendu ${show(expected)}, reçu ${show(actual)}`); },
    toEqual(expected: unknown) { if (show(actual) !== show(expected)) fail(`attendu ${show(expected)}, reçu ${show(actual)}`); },
    toBeNull() { if (actual !== null) fail(`attendu null, reçu ${show(actual)}`); },
    toBeTruthy() { if (!actual) fail(`attendu une valeur vraie, reçu ${show(actual)}`); },
    toBeGreaterThan(n: number) { if (!(typeof actual === 'number' && actual > n)) fail(`attendu > ${n}, reçu ${show(actual)}`); },
    toContain(item: unknown) { if (!Array.isArray(actual) || !actual.includes(item)) fail(`${show(actual)} ne contient pas ${show(item)}`); },
    toThrow() { try { (actual as () => void)(); } catch { return; } fail('une exception était attendue'); },
  };
  return { ...api, not: {
    toBe(expected: unknown) { if (Object.is(actual, expected)) fail(`ne devait pas valoir ${show(expected)}`); },
    toContain(item: unknown) { if (Array.isArray(actual) && actual.includes(item)) fail(`${show(actual)} ne devait pas contenir ${show(item)}`); },
  } };
}

export function report(): number {
  for (const f of failures) console.error('  ✘ ' + f);
  console.log(`Tests frontend (logique) : ${passed} réussis, ${failed} échoués`);
  return failed === 0 && passed > 0 ? 0 : 1;
}
