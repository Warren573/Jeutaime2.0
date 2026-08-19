export type TestModeStatus = {
  enabled: boolean;
  environment: 'development' | 'production';
};

export function getTestModeStatus(): TestModeStatus {
  return {
    enabled: __DEV__,
    environment: __DEV__ ? 'development' : 'production',
  };
}
