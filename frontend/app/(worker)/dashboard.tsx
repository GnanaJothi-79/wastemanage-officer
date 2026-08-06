import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getFirebaseBins } from '../../services/binService'; // Firebase for Bins
import { getWorkers, Worker } from '../../services/workerService'; // PostgreSQL for Workers
import { API_BASE } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WorkerDashboard() {
  const router = useRouter();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [workerId, setWorkerId] = useState<string | null>(null);
  
  // Bins and Tasks
  const [zoneBins, setZoneBins] = useState<any[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  
  // Stats
  const [stats, setStats] = useState({ total: 0, urgent: 0, warning: 0, good: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [newTaskAlert, setNewTaskAlert] = useState(false);
  
  // Keep track of previous task count to detect new ones
  const prevTaskCountRef = useRef(0);

  // ============================================================
  // 1. Get current Worker ID from AsyncStorage
  // ============================================================
  const loadWorkerProfile = useCallback(async () => {
    try {
      const id = await AsyncStorage.getItem('worker_id');
      const name = await AsyncStorage.getItem('worker_name');
      setWorkerId(id);
      
      // Fetch full worker details from PostgreSQL
      if (id) {
        const allWorkers = await getWorkers();
        const currentWorker = allWorkers.find(w => w.worker_id === id);
        setWorker(currentWorker || null);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }, []);

  // ============================================================
  // 2. Fetch Firebase Bins for the Worker's Zone
  // ============================================================
  const loadZoneBins = useCallback(async () => {
    if (!worker?.zone) return;
    
    try {
      const allBins = await getFirebaseBins(); // Firebase bins
      if (Array.isArray(allBins)) {
        setZoneBins(allBins);

        // Calculate stats based on the 3 bins average level
        const total = allBins.length;
        let urgent = 0, warning = 0, good = 0;
        allBins.forEach((bin: any) => {
          const avgLevel = Math.round((bin.bin_1_level + bin.bin_2_level + bin.bin_3_level) / 3);
          if (avgLevel >= 90) urgent++;
          else if (avgLevel >= 80) warning++;
          else good++;
        });
        setStats({ total, urgent, warning, good });
      }
    } catch (error) {
      console.error("Error loading bins:", error);
    }
  }, [worker]);

  // ============================================================
  // 3. Fetch TASKS assigned to this specific worker from POSTGRESQL
  // ============================================================
  const fetchWorkerTasks = useCallback(async () => {
    if (!workerId) return;

    try {
      // This calls the new backend endpoint we created in Step 1
      const response = await fetch(`${API_BASE}/tasks/worker/${workerId}`);
      if (response.ok) {
        const data = await response.json();
        
        // Filter pending tasks
        const pendingTasks = data.filter((t: any) => t.status === 'pending');

        // Check if a new task just came in
        if (pendingTasks.length > prevTaskCountRef.current) {
          setNewTaskAlert(true);
        }
        
        prevTaskCountRef.current = pendingTasks.length;
        setAssignedTasks(pendingTasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  }, [workerId]);

  // ============================================================
  // 4. Show Alert when a new task is detected
  // ============================================================
  useEffect(() => {
    if (newTaskAlert && assignedTasks.length > 0) {
      const latestTask = assignedTasks[assignedTasks.length - 1];
      Alert.alert(
        '🚨 New Assignment!',
        `You have been assigned to clean bin ${latestTask.bin_unit_id}.\nPriority: ${latestTask.priority || 'High'}`,
        [
          { text: 'View Task', onPress: () => {
              // Navigate to task details
              router.push({
                pathname: '/(worker)/taskDetails',
                params: { 
                  taskId: latestTask.id.toString(),
                  binId: latestTask.bin_unit_id.toString()
                }
              });
            } 
          },
          { text: 'OK', style: 'cancel' }
        ]
      );
      setNewTaskAlert(false);
    }
  }, [newTaskAlert, assignedTasks]);

  // ============================================================
  // 5. Polling Loop (Check for new tasks every 5 seconds)
  // ============================================================
  useEffect(() => {
    if (!workerId) return;

    // Run immediately
    fetchWorkerTasks();

    // Set up auto-refresh interval
    const intervalId = setInterval(() => {
      fetchWorkerTasks();
    }, 5000); // 5 seconds

    return () => clearInterval(intervalId);
  }, [workerId, fetchWorkerTasks]);

  // ============================================================
  // 6. Load everything on mount
  // ============================================================
  useEffect(() => {
    loadWorkerProfile();
  }, []);

  useEffect(() => {
    if (worker) {
      loadZoneBins();
    }
  }, [worker, loadZoneBins]);

  // ============================================================
  // 7. Refresh Handlers
  // ============================================================
  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkerProfile();
    await loadZoneBins();
    await fetchWorkerTasks();
    setRefreshing(false);
  };

  // ============================================================
  // 8. UI Helpers
  // ============================================================
  const getAvgLevel = (bin: any) => {
    return Math.round((bin.bin_1_level + bin.bin_2_level + bin.bin_3_level) / 3);
  };

  const getStatusColor = (level: number) => {
    if (level >= 90) return '#e74c3c';
    if (level >= 80) return '#f39c12';
    if (level >= 50) return '#3498db';
    return '#2ecc71';
  };

  const getStatusText = (level: number) => {
    if (level >= 90) return 'CRITICAL';
    if (level >= 80) return 'WARNING';
    if (level >= 50) return 'MODERATE';
    return 'GOOD';
  };

  const viewBinDetails = (bin: any) => {
    const avgLevel = getAvgLevel(bin);
    Alert.alert(
      'Bin Details',
      `📍 Unit ID: ${bin.unit_id}\n` +
      `📊 Fill Level: ${avgLevel}%\n` +
      `📍 Lat: ${bin.location?.lat}, Lng: ${bin.location?.long}`,
      [{ text: 'Close', style: 'cancel' }]
    );
  };

  if (!worker) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading worker data...</Text>
      </View>
    );
  }

  // ============================================================
  // 9. Render
  // ============================================================
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Worker Profile Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>🧹 Welcome, {worker.name}!</Text>
        <Text style={styles.workerId}>Worker ID: {worker.worker_id}</Text>
        <Text style={styles.workerId}>Zone: {worker.zone}</Text>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.totalCard]}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Bins</Text>
        </View>
        <View style={[styles.statCard, styles.urgentCard]}>
          <Text style={styles.statNumber}>{stats.urgent}</Text>
          <Text style={styles.statLabel}>Urgent</Text>
        </View>
        <View style={[styles.statCard, styles.warningCard]}>
          <Text style={styles.statNumber}>{stats.warning}</Text>
          <Text style={styles.statLabel}>Warning</Text>
        </View>
        <View style={[styles.statCard, styles.goodCard]}>
          <Text style={styles.statNumber}>{stats.good}</Text>
          <Text style={styles.statLabel}>Good</Text>
        </View>
      </View>

      {/* Active Task Alert */}
      {assignedTasks.length > 0 && (
        <View style={styles.taskAlertCard}>
          <Text style={styles.taskAlertTitle}>📌 You have {assignedTasks.length} pending task(s)!</Text>
          <TouchableOpacity 
            style={styles.viewTaskBtn}
            onPress={() => {
              const latestTask = assignedTasks[assignedTasks.length - 1];
              router.push({
                pathname: '/(worker)/taskDetails',
                params: { 
                  taskId: latestTask.id.toString(),
                  binId: latestTask.bin_unit_id.toString()
                }
              });
            }}
          >
            <Text style={styles.viewTaskBtnText}>View My Tasks</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bins in Zone Section */}
      <View style={styles.binsSection}>
        <Text style={styles.sectionTitle}>
          📦 Bins in Your Zone ({zoneBins.length})
        </Text>
        
        {zoneBins.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No bins found in your zone.</Text>
          </View>
        ) : (
          <FlatList
            data={zoneBins}
            keyExtractor={(item) => item.id || item.unit_id}
            renderItem={({ item }) => {
              const avgLevel = getAvgLevel(item);
              const statusColor = getStatusColor(avgLevel);
              const statusText = getStatusText(avgLevel);
              
              return (
                <TouchableOpacity 
                  style={[styles.binCard, { borderLeftColor: statusColor }]}
                  onPress={() => viewBinDetails(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.binHeader}>
                    <View>
                      <Text style={styles.binLocation}>{item.unit_id}</Text>
                      <Text style={styles.binId}>Firebase ID: {item.id}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                      <Text style={styles.statusText}>{statusText}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fill Level:</Text>
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { width: `${avgLevel}%`, backgroundColor: statusColor }]} />
                    </View>
                    <Text style={[styles.levelText, { color: statusColor }]}>{avgLevel}%</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  workerId: {
    fontSize: 14,
    color: '#bdc3c7',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  totalCard: { borderTopWidth: 3, borderTopColor: '#3498db' },
  urgentCard: { borderTopWidth: 3, borderTopColor: '#e74c3c' },
  warningCard: { borderTopWidth: 3, borderTopColor: '#f39c12' },
  goodCard: { borderTopWidth: 3, borderTopColor: '#2ecc71' },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    marginTop: 4,
  },
  taskAlertCard: {
    backgroundColor: '#fff3cd',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe69c',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  taskAlertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
  },
  viewTaskBtn: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewTaskBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  binsSection: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 16,
    color: '#2c3e50',
  },
  listContent: {
    paddingBottom: 20,
  },
  binCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderLeftWidth: 4,
  },
  binHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  binLocation: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  binId: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    width: 80,
    fontSize: 13,
    color: '#7f8c8d',
  },
  progressContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  levelText: {
    fontSize: 13,
    fontWeight: 'bold',
    minWidth: 40,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#95a5a6',
    fontSize: 16,
  },
});