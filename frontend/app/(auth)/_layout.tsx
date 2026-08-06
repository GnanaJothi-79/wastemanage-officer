import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="officer" options={{ headerShown: false }} />
      <Stack.Screen name="worker" options={{ headerShown: false }} />
    </Stack>
  );
}