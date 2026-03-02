import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="business/[slug]" />
        <Stack.Screen name="book/[slug]" />
        <Stack.Screen name="payment-webview" />
        <Stack.Screen name="payment-return" />
        <Stack.Screen name="payment-history" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="my-feedback" />
      </Stack>
    </AuthProvider>
  );
}
