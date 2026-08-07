/**
 * Test/staging mode detection in frontend.
 * Production must never be able to enable this from URL/localStorage.
 */

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isTestMode(): boolean {
  if (isProduction()) return false;

  // Hors production seulement : autoriser les outils de test web.
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'true') return true;

    try {
      return localStorage.getItem('jeutaime_test_mode') === 'true';
    } catch {
      // localStorage might not be available
    }
  }

  return true;
}

export function toggleTestMode(): void {
  if (isProduction() || typeof window === 'undefined') return;

  try {
    const current = localStorage.getItem('jeutaime_test_mode') === 'true';
    localStorage.setItem('jeutaime_test_mode', String(!current));
    console.log(`[TEST-MODE] Toggled to: ${!current}`);
  } catch {
    // localStorage might not be available
  }
}
