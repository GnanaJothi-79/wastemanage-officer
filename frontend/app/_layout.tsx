import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(officer)" options={{ headerShown: false }} />
      <Stack.Screen name="(worker)" options={{ headerShown: false }} />
    </Stack>
  );
}