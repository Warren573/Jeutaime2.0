#!/usr/bin/env node
/**
 * Contrôle de cohérence de la configuration iOS d'une version (lecture seule, aucun réseau, aucun secret).
 *
 * Usage (depuis frontend/) :  node scripts/check-ios-release-config.js 2.1.0
 *
 * Le dossier ios/ est versionné : EAS Build compile ses valeurs natives (Info.plist, Expo.plist) et IGNORE les
 * réglages natifs d'app.json. Les quatre valeurs suivantes doivent donc être identiques, sinon une OTA publiée
 * pour une version ne serait pas reçue par le build installé :
 *   - app.json            expo.version
 *   - app.json            expo.ios.runtimeVersion
 *   - ios/.../Info.plist  CFBundleShortVersionString   (version affichée dans « Application v… »)
 *   - ios/.../Expo.plist  EXUpdatesRuntimeVersion      (runtime que le binaire annonce à EAS Update)
 *
 * Le numéro de build (CFBundleVersion) n'est volontairement PAS vérifié ici : il est géré à distance par EAS
 * (eas.json : appVersionSource = remote, autoIncrement = true).
 */
const fs = require('fs');
const path = require('path');

const expected = process.argv[2];
const fail = [];
const ok = [];
const check = (label, condition, detail) => (condition ? ok : fail).push(`${label}${detail ? ' — ' + detail : ''}`);

if (!/^\d+\.\d+\.\d+$/.test(expected ?? '')) {
  console.error('Usage : node scripts/check-ios-release-config.js <MAJOR.MINOR.PATCH>   (ex. 2.1.0)');
  process.exit(2);
}

const frontend = path.resolve(__dirname, '..');
const repo = path.resolve(frontend, '..');
const read = (p) => fs.readFileSync(p, 'utf8');
const plistString = (xml, key) => {
  const m = xml.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
  return m ? m[1] : null;
};

const app = JSON.parse(read(path.join(frontend, 'app.json'))).expo;
const eas = JSON.parse(read(path.join(frontend, 'eas.json')));
const infoPlist = read(path.join(frontend, 'ios/JeuTaime/Info.plist'));
const expoPlist = read(path.join(frontend, 'ios/JeuTaime/Supporting/Expo.plist'));
const pbxproj = read(path.join(frontend, 'ios/JeuTaime.xcodeproj/project.pbxproj'));

// 1. Version et runtime
check('app.json expo.version', app.version === expected, `${app.version} (attendu ${expected})`);
check('app.json expo.ios.runtimeVersion', app.ios?.runtimeVersion === expected, `${app.ios?.runtimeVersion} (attendu ${expected})`);
check('Info.plist CFBundleShortVersionString', plistString(infoPlist, 'CFBundleShortVersionString') === expected, `${plistString(infoPlist, 'CFBundleShortVersionString')} (attendu ${expected})`);
check('Expo.plist EXUpdatesRuntimeVersion', plistString(expoPlist, 'EXUpdatesRuntimeVersion') === expected, `${plistString(expoPlist, 'EXUpdatesRuntimeVersion')} (attendu ${expected})`);

// 2. EAS Update : même serveur et mises à jour actives dans le binaire
check('Expo.plist EXUpdatesURL = app.json updates.url', plistString(expoPlist, 'EXUpdatesURL') === app.updates?.url, plistString(expoPlist, 'EXUpdatesURL') ?? 'absent');
check('Expo.plist EXUpdatesEnabled', /<key>EXUpdatesEnabled<\/key>\s*<true\/>/.test(expoPlist));

// 3. Identité de l'app
const bundleIds = [...pbxproj.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((m) => m[1].trim());
check('Identifiant de bundle (app.json = projet Xcode)', bundleIds.length > 0 && bundleIds.every((b) => b === app.ios?.bundleIdentifier), `${app.ios?.bundleIdentifier} / Xcode : ${[...new Set(bundleIds)].join(', ')}`);

// 4. EAS Build / Submit : numéro de build géré à distance, canal des OTA, identifiant App Store Connect
check('eas.json appVersionSource = remote', eas.cli?.appVersionSource === 'remote');
check('eas.json build.production.autoIncrement', eas.build?.production?.autoIncrement === true);
check('eas.json build.production.channel = internal-test', eas.build?.production?.channel === 'internal-test', String(eas.build?.production?.channel));
check('eas.json submit.production.ios.ascAppId numérique', /^[0-9]{6,12}$/.test(String(eas.submit?.production?.ios?.ascAppId ?? '')));

// 5. Workflow de publication OTA iOS : runtime attendu et branche cohérents avec le build
const otaWorkflow = read(path.join(repo, '.github/workflows/update-ios-internal.yml'));
const wfRuntime = (otaWorkflow.match(/EXPECTED_RUNTIME:\s*'([^']+)'/) || [])[1];
const wfBranch = (otaWorkflow.match(/EAS_UPDATE_BRANCH:\s*(\S+)/) || [])[1];
check('update-ios-internal.yml EXPECTED_RUNTIME', wfRuntime === expected, `${wfRuntime} (attendu ${expected})`);
check('update-ios-internal.yml branche EAS = canal du build', wfBranch === eas.build?.production?.channel, `${wfBranch} / canal ${eas.build?.production?.channel}`);
check('update-ios-internal.yml numéro d\'OTA préfixé par la version', otaWorkflow.includes(`EXPO_PUBLIC_OTA_RELEASE_VERSION: ${expected}-ios-ota.`));

// Information (non bloquant) : Android n'est pas concerné par cette version
const androidRuntime = app.android?.runtimeVersion;
console.log(`Information — Android inchangé : runtimeVersion ${androidRuntime} (aucun build ni OTA Android pour ${expected}).`);

console.log(`\nConfiguration iOS ${expected} : ${ok.length} contrôle(s) conforme(s), ${fail.length} écart(s).`);
for (const line of ok) console.log(`  ✔ ${line}`);
for (const line of fail) console.error(`  ✘ ${line}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  const md = [`### Configuration iOS ${expected}`, ...ok.map((l) => `- ✅ ${l}`), ...fail.map((l) => `- ❌ ${l}`), ''].join('\n');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}
process.exit(fail.length ? 1 : 0);
