import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCurrentOfficer, logoutOfficer, Officer } from '../../services/authService';
import { getFirebaseBins, syncFirebaseToPostgres } from '../../services/binService';
import { getWorkers } from '../../services/workerService';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { API_BASE } from '../../services/api';

// Helper: Calculate distance between two GPS coordinates (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
};

const deg2rad = (deg: number) => deg * (Math.PI/180);

export default function OfficerDashboard() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState({ workers: 0, bins: 0, cleanliness: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [currentOfficer, setCurrentOfficer] = useState<Officer | null>(null);

  const loadData = useCallback(async () => {
    try {
      console.log('🔄 Loading dashboard data...');
      
      // 1. Fetch Firebase bins
      const fbBins = await getFirebaseBins({ overflow: false });
      console.log('📦 Firebase bins response:', fbBins);
      
      // 2. Fetch workers
      const workers = await getWorkers();
      console.log('👷 Workers:', workers);

      // 3. Process bins for alerts
      let totalLevel = 0;
      let binCount = 0;
      const overflowAlerts: any[] = [];

      if (fbBins && fbBins.data && Array.isArray(fbBins.data) && fbBins.data.length > 0) {
        fbBins.data.forEach((bin: any) => {
          const binLat = bin.location?.lat;
          const binLng = bin.location?.long;
          const maxLevel = bin.max_level || 0;
          
          totalLevel += maxLevel;
          binCount++;

          // Check overflow (threshold 75%)
          if (maxLevel >= 75 && binLat && binLng) {
            // Find nearest worker
            let nearestWorker: any = null;
            let shortestDistance = Infinity;

            workers.forEach((worker: any) => {
              if (worker.lat && worker.lng) {
                const distance = calculateDistance(
                  binLat, binLng,
                  worker.lat, worker.lng
                );
                if (distance < shortestDistance) {
                  shortestDistance = distance;
                  nearestWorker = worker;
                }
              }
            });

            overflowAlerts.push({
              id: bin.id,
              bin_unit_id: bin.unit_id || bin.id,
              binId: bin.unit_id || bin.id,
              areaName: `Bin ${bin.unit_id || bin.id}`,
              zone: `Lat: ${binLat.toFixed(4)}, Long: ${binLng.toFixed(4)}`,
              level: maxLevel,
              max_level: maxLevel,
              worker_name: nearestWorker?.name || 'No worker assigned',
              worker_id: nearestWorker?.worker_id || 'N/A',
              worker_status: nearestWorker?.status || 'N/A',
              distance_km: nearestWorker ? parseFloat(shortestDistance.toFixed(2)) : null
            });
          }
        });
      }

      console.log(`📊 Found ${overflowAlerts.length} overflow alerts`);

      setAlerts(overflowAlerts);
      setStats({
        workers: workers.length,
        bins: binCount,
        cleanliness: binCount === 0 ? 100 : Math.floor(100 - (totalLevel / binCount)),
      });
    } catch (error) {
      console.error('❌ Error loading data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    }
  }, []);

  const loadCurrentOfficer = useCallback(async () => {
    const officer = await getCurrentOfficer();
    setCurrentOfficer(officer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadCurrentOfficer();
    }, [loadData, loadCurrentOfficer])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await loadCurrentOfficer();
    setRefreshing(false);
  };

  // ✅ Sync Firebase data to PostgreSQL (READ-ONLY)
  const handleSyncFirebase = async () => {
    Alert.alert(
      'Sync Firebase Data',
      'This will update PostgreSQL bin levels with Firebase data.\n\nDoes NOT modify Firebase database.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync',
          onPress: async () => {
            try {
              const result = await syncFirebaseToPostgres();
              Alert.alert('Success', result.message);
              loadData(); // Refresh dashboard
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to sync');
            }
          }
        }
      ]
    );
  };

  const handleEscalateToWorker = async (alert: any) => {
    console.log('🔔 Alert data:', alert);
    
    if (!alert.bin_unit_id) {
      Alert.alert('Error', 'Bin ID not found for this alert');
      return;
    }
    
    if (alert.worker_id === 'N/A' || alert.worker_status !== 'active') {
      Alert.alert(
        'Cannot Escalate',
        `No active worker with GPS found near zone ${alert.zone}.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Escalate Alert',
      `Send notification to nearest worker ${alert.worker_name} (${alert.distance_km || 0}km away) for bin ${alert.binId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Notification',
          onPress: async () => {
            try {
              console.log('📝 Creating task for bin:', alert.bin_unit_id);
              
              // STEP 1: Find the bin in PostgreSQL by unit_id
              let postgresBinId = null;
              
              try {
                console.log(`🔍 Looking for bin with unit_id: ${alert.bin_unit_id}`);
                const findResponse = await fetch(`${API_BASE}/bins/unit-id/${alert.bin_unit_id}`);
                
                if (findResponse.ok) {
                  const binData = await findResponse.json();
                  postgresBinId = binData.id;
                  console.log('✅ Found existing bin with ID:', postgresBinId);
                } else {
                  console.log('📦 Bin not found, creating new one...');
                  
                  let lat = 8.7312;
                  let lng = 77.6923;
                  
                  if (alert.zone) {
                    const latMatch = alert.zone.match(/Lat:\s*([\d.]+)/);
                    const lngMatch = alert.zone.match(/Long:\s*([\d.]+)/);
                    if (latMatch) lat = parseFloat(latMatch[1]);
                    if (lngMatch) lng = parseFloat(lngMatch[1]);
                  }
                  
                  const createResponse = await fetch(`${API_BASE}/bins/bin-units/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      unit_id: alert.bin_unit_id,
                      location: alert.areaName || alert.binId || alert.bin_unit_id,
                      latitude: lat,
                      longitude: lng,
                      status: 'active',
                      zone: '28-4555-2'
                    })
                  });
                  
                  if (createResponse.ok) {
                    const newBin = await createResponse.json();
                    postgresBinId = newBin.id;
                    console.log('✅ Created new bin with ID:', postgresBinId);
                  } else {
                    const errorText = await createResponse.text();
                    console.error('❌ Failed to create bin:', errorText);
                    throw new Error('Failed to create bin in PostgreSQL');
                  }
                }
              } catch (findError) {
                console.error('❌ Error finding/creating bin:', findError);
                Alert.alert('Error', 'Could not find or create bin. Please try again.');
                return;
              }
              
              if (!postgresBinId) {
                Alert.alert('Error', 'Could not find or create bin');
                return;
              }

              // STEP 2: Create task using the integer ID
              console.log(`📝 Creating task for bin ID: ${postgresBinId}`);
              const response = await fetch(`${API_BASE}/tasks/auto-assign/${postgresBinId}`, {
                method: 'POST',
              });
              
              if (response.ok) {
                const result = await response.json();
                if (result.already_exists) {
                  Alert.alert('Info', `Task already exists for bin ${alert.binId}`);
                } else {
                  Alert.alert('Success', `Task assigned to ${alert.worker_name}`);
                }
                loadData();
              } else {
                const error = await response.json();
                console.error('❌ Task creation error:', error);
                Alert.alert('Error', error.detail || 'Failed to create task');
              }
              
            } catch (error) {
              console.error('❌ Escalation error:', error);
              Alert.alert('Error', 'Failed to escalate');
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logoutOfficer();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <LinearGradient colors={['#2ecc71', '#27ae60']} style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.officerName}>{currentOfficer?.name || 'Officer'}</Text>
          <Text style={styles.officerId}>ID: {currentOfficer?.officer_id || '---'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleSyncFirebase} style={styles.syncBtn}>
            <MaterialCommunityIcons name="sync" size={20} color="#fff" />
            <Text style={styles.syncBtnText}>Sync</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.workers}</Text>
          <Text style={styles.statLabel}>Total Workers</Text>
          <View style={styles.statIcon}><Ionicons name="people-outline" size={40} color="#2ecc71" /></View>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.bins}</Text>
          <Text style={styles.statLabel}>Total Bins</Text>
          <View style={styles.statIcon}><MaterialCommunityIcons name="trash-can-outline" size={40} color="#2ecc71" /></View>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.cleanliness}%</Text>
          <Text style={styles.statLabel}>Cleanliness</Text>
          <View style={styles.statIcon}><MaterialCommunityIcons name="leaf" size={40} color="#2ecc71" /></View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="alert-circle" size={24} color="#e74c3c" />
          <Text style={styles.cardTitle}> Overflow Alerts</Text>
        </View>
        {alerts.length === 0 ? (
          <View style={styles.emptyAlert}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#2ecc71" />
            <Text style={styles.emptyAlertText}> All bins are good</Text>
          </View>
        ) : (
          alerts.map((alert, i) => (
            <View key={i} style={styles.alertItem}>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{alert.areaName || `Bin ${alert.binId}`}</Text>
                <Text style={styles.alertZone}>Fill: {alert.level}%</Text>
                <View style={styles.levelContainer}>
                  <Text style={styles.levelLabel}>Fill Level:</Text>
                  <View style={styles.levelBar}>
                    <View style={[styles.levelFill, { width: `${alert.level}%`, backgroundColor: alert.level >= 90 ? '#e74c3c' : '#f39c12' }]} />
                  </View>
                  <Text style={[styles.levelValue, { color: alert.level >= 90 ? '#e74c3c' : '#f39c12' }]}>{alert.level}%</Text>
                </View>
                <View style={styles.workerInfo}>
                  <Ionicons name="person-outline" size={14} color="#7f8c8d" />
                  <Text style={styles.workerInfoText}>
                    Nearest Worker: {alert.worker_name} {alert.distance_km !== null ? `(${alert.distance_km}km)` : ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.escalateBtn} onPress={() => handleEscalateToWorker(alert)}>
                <MaterialCommunityIcons name="send" size={18} color="#fff" />
                <Text style={styles.escalateBtnText}>Notify</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: { fontSize: 14, color: '#fff', opacity: 0.9 },
  officerName: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  officerId: { fontSize: 12, color: '#fff', opacity: 0.8, marginTop: 4 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  syncBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  syncBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50' },
  statLabel: { fontSize: 12, color: '#7f8c8d', marginTop: 4 },
  statIcon: { position: 'absolute', bottom: 5, right: 5, opacity: 0.15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#2c3e50' },
  emptyAlert: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  emptyAlertText: { color: '#2ecc71', fontSize: 14, marginLeft: 8 },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 15, fontWeight: '500', color: '#2c3e50' },
  alertZone: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  levelContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  levelLabel: { fontSize: 12, color: '#7f8c8d', marginRight: 8 },
  levelBar: { flex: 1, height: 6, backgroundColor: '#ecf0f1', borderRadius: 3, overflow: 'hidden' },
  levelFill: { height: '100%', borderRadius: 3 },
  levelValue: { fontSize: 12, fontWeight: 'bold', marginLeft: 8, minWidth: 35 },
  workerInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  workerInfoText: { fontSize: 12, color: '#3498db', marginLeft: 4 },
  escalateBtn: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  escalateBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});