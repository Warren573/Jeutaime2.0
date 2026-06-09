/**
 * Test/staging mode detection in frontend
 */

export function isTestMode(): boolean {
  // Check for debug flag in URL params or local storage
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'true') return true;

    // Also check localStorage for persistent debug flag
    try {
      return localStorage.getItem('jeutaime_test_mode') === 'true';
    } catch {
      // localStorage might not be available
    }
  }

  // In development build, enable test mode by default
  return process.env.NODE_ENV !== 'production';
}

export function toggleTestMode(): void {
  if (typeof window !== 'undefined') {
    try {
      const current = localStorage.getItem('jeutaime_test_mode') === 'true';
      localStorage.setItem('jeutaime_test_mode', String(!current));
      console.log(`[TEST-MODE] Toggled to: ${!current}`);
    } catch {
      // localStorage might not be available
    }
  }
}
