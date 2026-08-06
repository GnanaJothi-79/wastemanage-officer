import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function WorkerProfileScreen() {
  const router = useRouter();
  const [worker, setWorker] = useState<any>(null);
  const [stats, setStats] = useState({ tasksCompleted: 0, rating: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const workerData = await AsyncStorage.getItem('worker');
      if (!workerData) {
        router.replace('/(auth)/login');
        return;
      }
      const workerInfo = JSON.parse(workerData);
      setWorker(workerInfo);

      // Fetch completed tasks count
      const response = await fetch(`${API_BASE}/tasks/worker/${workerInfo.id}/completed`);
      const completedTasks = await response.json();
      setStats({ tasksCompleted: completedTasks.length, rating: 4.8 });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('worker');
          await AsyncStorage.removeItem('worker_id');
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2ecc71', '#27ae60']} style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={50} color="#fff" />
        </View>
        <Text style={styles.workerName}>{worker?.name || 'Worker'}</Text>
        <Text style={styles.workerId}>ID: {worker?.worker_id || '---'}</Text>
        <Text style={styles.workerEmail}>{worker?.email || '---'}</Text>
        <View style={styles.zoneBadge}>
          <Text style={styles.zoneText}>Zone: {worker?.zone || 'Not assigned'}</Text>
        </View>
      </LinearGradient>

      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="check-circle" size={28} color="#2ecc71" />
          <Text style={styles.statValue}>{stats.tasksCompleted}</Text>
          <Text style={styles.statLabel}>Tasks Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="star" size={28} color="#f39c12" />
          <Text style={styles.statValue}>{stats.rating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={22} color="#e74c3c" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', paddingTop: 50, paddingBottom: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  workerName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  workerId: { fontSize: 14, color: '#fff', opacity: 0.9, marginBottom: 2 },
  workerEmail: { fontSize: 14, color: '#fff', opacity: 0.8, marginBottom: 8 },
  zoneBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  zoneText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  statsSection: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginTop: -20, borderRadius: 20, padding: 16, elevation: 3 },
  statItem: { flex: 1, alignItems: 'center', gap: 8 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50' },
  statLabel: { fontSize: 12, color: '#7f8c8d' },
  statDivider: { width: 1, backgroundColor: '#eee' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginTop: 30, padding: 16, backgroundColor: '#fff', borderRadius: 12, gap: 8 },
  logoutText: { fontSize: 16, color: '#e74c3c', fontWeight: '500' },
});