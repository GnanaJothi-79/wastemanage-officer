import { Stack } from 'expo-router';

export default function WorkerLayout() {
  return (
    <Stack>
      <Stack.Screen name="dashboard" options={{ title: 'My Dashboard', headerShown: true }} />
      <Stack.Screen name="navigation" options={{ title: 'Navigate to Bin', headerShown: true }} />
    </Stack>
  );
}