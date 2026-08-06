import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface Task {
  id: number;
  task_id: string;
  bin_unit_id: number;
  bin_location: string;
  bin_area: string;
  status: 'pending' | 'in-progress' | 'completed' | 'ignored';
  assigned_at: string;
  completed_at?: string;
  priority: string;
  zone: string;
}

export default function WorkerDashboard() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [worker, setWorker] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
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

      // Store worker_id for GPS tracking
      await AsyncStorage.setItem('worker_id', workerInfo.id?.toString() || workerInfo.worker_id);

      console.log('Fetching tasks for worker ID:', workerInfo.id);
      const response = await fetch(`${API_BASE}/tasks/worker/${workerInfo.id}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        throw new Error('Failed to fetch tasks');
      }
      
      const tasksData = await response.json();
      console.log('Tasks received:', tasksData);
      
      setTasks(tasksData.filter((t: Task) => t.status !== 'completed'));
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleTaskPress = (task: Task) => {
    console.log('Task pressed:', task);
    router.push({
      pathname: '/(workermod)/taskDetails',
      params: {
        taskId: task.task_id,
        binId: task.bin_unit_id.toString(),
        binLocation: task.bin_area || task.bin_location,
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'in-progress': return '#3498db';
      case 'completed': return '#2ecc71';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in-progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const renderTaskCard = ({ item }: { item: Task }) => (
    <TouchableOpacity style={styles.taskCard} onPress={() => handleTaskPress(item)}>
      <View style={styles.taskHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
        <Text style={styles.priorityText}>{item.priority}</Text>
      </View>
      <Text style={styles.taskLocation}>{item.bin_area || item.bin_location}</Text>
      <Text style={styles.taskZone}>Zone: {item.zone}</Text>
      <Text style={styles.taskDate}>Assigned: {new Date(item.assigned_at).toLocaleDateString()}</Text>
      <View style={styles.navigateBtn}>
        <Text style={styles.navigateText}>Tap to View Details →</Text>
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.welcomeText}>Welcome,</Text>
        <Text style={styles.workerName}>{worker?.name || 'Worker'}</Text>
        <Text style={styles.statsText}>{tasks.length} Active Tasks</Text>
      </LinearGradient>

      <View style={styles.tasksSection}>
        <Text style={styles.sectionTitle}>📋 Assigned Tasks</Text>
        <FlatList
          data={tasks}
          keyExtractor={item => item.task_id}
          renderItem={renderTaskCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="check-circle" size={60} color="#2ecc71" />
              <Text style={styles.emptyText}>No pending tasks!</Text>
              <Text style={styles.emptySubtext}>Great job! All tasks completed.</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 30, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  welcomeText: { fontSize: 14, color: '#fff', opacity: 0.9 },
  workerName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  statsText: { fontSize: 14, color: '#fff', opacity: 0.8, marginTop: 8 },
  tasksSection: { flex: 1, paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#2c3e50', marginBottom: 12 },
  listContent: { paddingBottom: 20 },
  taskCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  priorityText: { fontSize: 12, color: '#e74c3c', fontWeight: '600' },
  taskLocation: { fontSize: 16, fontWeight: '600', color: '#2c3e50', marginBottom: 4 },
  taskZone: { fontSize: 12, color: '#7f8c8d', marginBottom: 4 },
  taskDate: { fontSize: 12, color: '#7f8c8d', marginBottom: 12 },
  navigateBtn: { paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  navigateText: { color: '#3498db', fontSize: 13, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#7f8c8d', marginTop: 8 },
});