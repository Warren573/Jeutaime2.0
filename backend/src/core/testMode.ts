/**
 * Test/staging mode detection.
 * Test-only relaxations must never be activatable in production.
 */

export function isTestMode(): boolean {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Production is always strict, regardless of any leftover env flag.
  if (nodeEnv === 'production') return false;

  // Outside production, explicit flag can enable/disable test behaviour.
  return process.env.JEUTAIME_TEST_MODE === 'true' || nodeEnv === 'development' || nodeEnv === 'test';
}

export function logTestMode(context: string): void {
  if (isTestMode()) {
    console.log(`[TEST-MODE] ${context}`);
  }
}
