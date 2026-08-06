import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { API_BASE } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function TaskDetailsScreen() {
  const { taskId, binId, binLocation } = useLocalSearchParams();
  const [task, setTask] = useState<any>(null);
  const [bin, setBin] = useState<any>(null);
  const [worker, setWorker] = useState<any>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    loadTaskDetails();
  }, []);

  const loadTaskDetails = async () => {
    try {
      const workerData = await AsyncStorage.getItem('worker');
      if (!workerData) {
        router.replace('/(auth)/login');
        return;
      }
      const workerInfo = JSON.parse(workerData);
      setWorker(workerInfo);

      console.log('=== DEBUG INFO ===');
      console.log('Worker ID:', workerInfo.id);
      console.log('Worker zone from storage:', workerInfo.zone);

      // Fetch task details
      const taskResponse = await fetch(`${API_BASE}/tasks/${taskId}`);
      const taskData = await taskResponse.json();
      setTask(taskData);
      console.log('Task data:', taskData);

      // Fetch bin details
      const binResponse = await fetch(`${API_BASE}/bins/${taskData.bin_unit_id}`);
      const binData = await binResponse.json();
      setBin(binData);
      console.log('Bin data:', binData);
      console.log('Bin zone:', binData.zone);
      console.log('Worker zone:', workerInfo.zone);
      console.log('Zones match:', workerInfo.zone === binData.zone);
      console.log('================');

      // Check if worker's zone matches bin's zone
      if (workerInfo.zone === binData.zone) {
        setAuthorized(true);
        
        const workerLat = workerInfo.lat || 12.9716;
        const workerLng = workerInfo.lng || 77.5946;
        const distanceKm = calculateDistance(workerLat, workerLng, binData.latitude, binData.longitude);
        setDistance(distanceKm);
      } else {
        console.log('ACCESS DENIED: Zones do not match');
        setAuthorized(false);
      }
    } catch (error) {
      console.error('Error loading task details:', error);
      Alert.alert('Error', 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const completeTask = async () => {
    Alert.alert(
      'Complete Task',
      'Have you collected the waste from this bin?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Complete',
          onPress: async () => {
            setSubmitting(true);
            try {
              const response = await fetch(`${API_BASE}/tasks/${taskId}/complete`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  status: 'completed',
                  completed_at: new Date().toISOString()
                }),
              });

              if (!response.ok) throw new Error('Failed to complete task');

              await fetch(`${API_BASE}/bins/${bin.id}/metadata`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level: 0, last_cleaned: new Date().toISOString() }),
              });

              Alert.alert('Success', 'Task completed successfully!');
              router.replace('/(workermod)/dashboard');
            } catch (error) {
              Alert.alert('Error', 'Failed to complete task');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const navigateToBin = () => {
    router.push({
      pathname: '/(workermod)/navigation',
      params: {
        binId: bin?.unit_id,
        binLocation: bin?.location,
        binLat: bin?.latitude.toString(),
        binLng: bin?.longitude.toString(),
        distance: distance?.toString()
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  if (!authorized) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="lock" size={60} color="#e74c3c" />
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorText}>
          This bin is not in your assigned zone.
        </Text>
        <Text style={styles.errorSubtext}>
          Your Zone: {worker?.zone || 'Not assigned'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOverThreshold = bin?.level >= bin?.threshold;
  const fillStatus = isOverThreshold ? 'Critical - Needs Immediate Action' : 'Normal';
  const fillColor = isOverThreshold ? '#e74c3c' : '#2ecc71';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>📍 {bin?.location || 'Bin Location'}</Text>
        <Text style={styles.subtitle}>Unit ID: {bin?.unit_id}</Text>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={22} color="#2ecc71" />
          <Text style={styles.infoText}>Zone: {bin?.zone || 'Not assigned'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="checkmark-circle" size={22} color="#2ecc71" />
          <Text style={styles.infoText}>Your Zone: {worker?.zone}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="water-percent" size={22} color={fillColor} />
          <Text style={[styles.infoText, { color: fillColor }]}>
            Fill Level: {bin?.level || 0}%
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${Math.min(bin?.level || 0, 100)}%`, backgroundColor: fillColor }]} />
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="alert-outline" size={22} color="#f39c12" />
          <Text style={styles.infoText}>Threshold: {bin?.threshold || 80}%</Text>
        </View>

        <View style={[styles.statusCard, { backgroundColor: isOverThreshold ? '#fdeaea' : '#e8f8f0' }]}>
          <MaterialCommunityIcons 
            name={isOverThreshold ? "alert-circle" : "check-circle"} 
            size={24} 
            color={isOverThreshold ? "#e74c3c" : "#2ecc71"} 
          />
          <Text style={[styles.statusText, { color: isOverThreshold ? "#e74c3c" : "#2ecc71" }]}>
            {fillStatus}
          </Text>
        </View>

        {isOverThreshold && (
          <View style={styles.warningCard}>
            <MaterialCommunityIcons name="exclamation-thick" size={20} color="#e74c3c" />
            <Text style={styles.warningText}>
              ⚠️ Bin fill level exceeds threshold! Immediate collection required.
            </Text>
          </View>
        )}

        {distance !== null && (
          <View style={styles.distanceCard}>
            <MaterialCommunityIcons name="map-marker-distance" size={28} color="#2ecc71" />
            <Text style={styles.distanceText}>{distance.toFixed(2)} km away</Text>
            <Text style={styles.distanceSubtext}>from your current location</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="clock-outline" size={22} color="#7f8c8d" />
          <Text style={styles.infoText}>
            Last Cleaned: {bin?.last_cleaned ? new Date(bin.last_cleaned).toLocaleString() : 'Never'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={22} color="#7f8c8d" />
          <Text style={styles.infoText}>
            Assigned: {task?.assigned_at ? new Date(task.assigned_at).toLocaleString() : 'Unknown'}
          </Text>
        </View>

        <TouchableOpacity style={styles.navigateButton} onPress={navigateToBin}>
          <Ionicons name="navigate-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Navigate to Bin</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.completeButton, isOverThreshold && styles.urgentButton]} 
          onPress={completeTask} 
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {isOverThreshold ? '🚨 Collect & Complete' : 'Mark as Completed'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#fff', margin: 16, borderRadius: 20, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50' },
  subtitle: { fontSize: 14, color: '#7f8c8d', marginTop: 4, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  infoText: { fontSize: 16, color: '#2c3e50', marginLeft: 12 },
  progressContainer: { height: 8, backgroundColor: '#ecf0f1', borderRadius: 4, marginVertical: 12, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 4 },
  statusCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginVertical: 12, gap: 8 },
  statusText: { fontSize: 16, fontWeight: '600' },
  warningCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdeaea', padding: 12, borderRadius: 12, marginVertical: 8, gap: 8 },
  warningText: { flex: 1, fontSize: 14, color: '#e74c3c' },
  distanceCard: { backgroundColor: '#e8f8f0', borderRadius: 16, padding: 16, alignItems: 'center', marginVertical: 16 },
  distanceText: { fontSize: 24, fontWeight: 'bold', color: '#2ecc71', marginTop: 8 },
  distanceSubtext: { fontSize: 12, color: '#7f8c8d', marginTop: 4 },
  navigateButton: { backgroundColor: '#3498db', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  completeButton: { backgroundColor: '#2ecc71', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  urgentButton: { backgroundColor: '#e74c3c' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  errorTitle: { fontSize: 24, fontWeight: 'bold', color: '#e74c3c', marginTop: 16 },
  errorText: { fontSize: 16, color: '#7f8c8d', marginTop: 8, textAlign: 'center' },
  errorSubtext: { fontSize: 14, color: '#95a5a6', marginTop: 4, textAlign: 'center' },
  backButton: { backgroundColor: '#3498db', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 24 },
  backButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});