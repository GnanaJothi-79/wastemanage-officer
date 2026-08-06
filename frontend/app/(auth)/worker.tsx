import { router } from 'expo-router';
import { useEffect } from 'react';

export default function WorkerRedirect() {
  useEffect(() => {
    // Later you'll redirect to worker dashboard
    // For now, show a placeholder or redirect to login
    router.replace('/(auth)/login');
  }, []);
  return null;
}