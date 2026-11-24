import { Stack } from 'expo-router';

export default function SalonLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        orientation: 'portrait_up',
      }}
    />
  );
}
