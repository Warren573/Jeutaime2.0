import type { PropsWithChildren } from 'react';

export function TestModeGuard({ children }: PropsWithChildren) {
  if (!__DEV__) return null;
  return children;
}
