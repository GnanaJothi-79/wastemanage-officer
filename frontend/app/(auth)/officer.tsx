import { router } from 'expo-router';
import { useEffect } from 'react';

export default function OfficerRedirect() {
  useEffect(() => {
    router.replace('/(officer)');
  }, []);
  return null;
}