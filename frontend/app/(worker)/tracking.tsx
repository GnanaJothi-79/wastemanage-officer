import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { API_BASE } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WorkerTrackingScreen() {
  const [workerId, setWorkerId] = useState<string | null>(null);

  // 1. Get the logged-in worker's ID
  useEffect(() => {
    const getWorkerId = async () => {
      const id = await AsyncStorage.getItem('worker_id');
      setWorkerId(id);
    };
    getWorkerId();
  }, []);

  // 2. Setup GPS tracking loop (Send every 10 seconds)
  useEffect(() => {
    let intervalId: number;

    const startTracking = async () => {
      if (!workerId) return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location required for tracking.');
        return;
      }

      const sendLocation = async () => {
        try {
          const location = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = location.coords;

          await fetch(`${API_BASE}/workers/location`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              worker_id: workerId,
              latitude: latitude,
              longitude: longitude
            })
          });
        } catch (error) {
          console.error('Failed to update location:', error);
        }
      };

      await sendLocation();
      intervalId = setInterval(sendLocation, 10000); // 10 seconds
    };

    startTracking();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [workerId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GPS Tracking Active</Text>
      <Text style={styles.subtitle}>Sending live location every 10 seconds...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7fa' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2ecc71', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#7f8c8d', textAlign: 'center' },
});