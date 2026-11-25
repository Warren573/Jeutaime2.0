import { describe, test, expect } from '../test-support/assert';
import { hostOf, serverLabel } from './serverInfo';

describe('serveur réellement joint par l’application', () => {
  test('hôte extrait de l’URL de l’API', () => {
    expect(hostOf('https://jeutaime-staging.onrender.com/api')).toBe('jeutaime-staging.onrender.com');
    expect(hostOf('http://localhost:8765/api')).toBe('localhost:8765');
    expect(hostOf('pas-une-url')).toBe('pas-une-url');
  });
  test('libellé : hôte + build abrégé à 7 caractères (comparable au SHA déployé)', () => {
    expect(serverLabel({ host: 'jeutaime-staging.onrender.com', buildSha: '11257dcefb68da106a83bb4f9575210203bde5e4' }))
      .toBe('Serveur : jeutaime-staging.onrender.com · build 11257dc');
  });
  test('build inconnu, absent ou en cours de lecture : jamais de valeur inventée', () => {
    expect(serverLabel(null)).toBe('Serveur : vérification…');
    expect(serverLabel({ host: 'h', buildSha: null })).toBe('Serveur : h · version indisponible');
    expect(serverLabel({ host: 'h', buildSha: 'unknown' })).toBe('Serveur : h · version indisponible');
  });
});
