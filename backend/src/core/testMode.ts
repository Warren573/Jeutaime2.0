/**
 * Test/staging mode detection
 * Allows self-targeting and other test features in development
 */

export function isTestMode(): boolean {
  // Check NODE_ENV or explicit test flag
  const nodeEnv = process.env.NODE_ENV || 'development';
  const testFlag = process.env.JEUTAIME_TEST_MODE === 'true';

  // Enable test mode in development or with explicit flag
  return nodeEnv !== 'production' || testFlag;
}

export function logTestMode(context: string): void {
  if (isTestMode()) {
    console.log(`[TEST-MODE] ${context}`);
  }
}
