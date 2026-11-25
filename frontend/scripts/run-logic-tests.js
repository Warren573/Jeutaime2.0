#!/usr/bin/env node
/**
 * Exécute les tests de logique pure du frontend (src/**\/*.test.ts) sans dépendance de test :
 * transpilation TypeScript à la volée. Code de sortie ≠ 0 si une assertion échoue ou si aucun test ne tourne.
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(out.outputText, filename);
};

function collect(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : collect(full);
    return entry.name.endsWith('.test.ts') ? [full] : [];
  });
}

const root = path.resolve(__dirname, '..', 'src');
const files = collect(root).sort();
if (files.length === 0) { console.error('Aucun fichier *.test.ts trouvé'); process.exit(1); }
for (const file of files) {
  console.log('→ ' + path.relative(path.resolve(__dirname, '..'), file));
  require(file);
}
process.exit(require(path.join(root, 'test-support', 'assert.ts')).report());
