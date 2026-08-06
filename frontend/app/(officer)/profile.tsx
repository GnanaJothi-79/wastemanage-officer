import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { 
  Alert, 
  RefreshControl, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  ActivityIndicator 
} from 'react-native';
import { getCurrentOfficer, logoutOfficer, Officer } from '../../services/authService';
import { getFirebaseBins } from '../../services/binService'; // Firebase only
import { getWorkers } from '../../services/workerService';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function OfficerProfile() {
  const router = useRouter();
  const [officer, setOfficer] = useState<Officer | null>(null);
  const [stats, setStats] = useState({ workers: 0, bins: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch current officer details
      const currentOfficer = await getCurrentOfficer();
      setOfficer(currentOfficer);

      // Fetch Firebase bins and PostgreSQL Workers
      const fbBins = await getFirebaseBins();
      const workers = await getWorkers();

      // Update Stats
      setStats({
        workers: workers.length,
        bins: Array.isArray(fbBins) ? fbBins.length : 0,
      });

    } catch (error) {
      console.error('Error loading profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2ecc71" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Profile Header */}
      <LinearGradient
        colors={['#2ecc71', '#27ae60']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {officer?.name?.charAt(0).toUpperCase() || 'O'}
            </Text>
          </View>
        </View>
        <Text style={styles.officerName}>{officer?.name || 'Officer'}</Text>
        <Text style={styles.officerId}>ID: {officer?.officer_id || '---'}</Text>
        <Text style={styles.officerEmail}>{officer?.email || 'No email provided'}</Text>
      </LinearGradient>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#e8f5e9' }]}>
            <MaterialCommunityIcons name="trash-can-outline" size={28} color="#2ecc71" />
          </View>
          <Text style={styles.statNumber}>{stats.bins}</Text>
          <Text style={styles.statLabel}>Total Bins (Firebase)</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#e3f2fd' }]}>
            <Ionicons name="people-outline" size={28} color="#2196f3" />
          </View>
          <Text style={styles.statNumber}>{stats.workers}</Text>
          <Text style={styles.statLabel}>Total Workers</Text>
        </View>
      </View>

      {/* Officer Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Details</Text>
        
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="badge-account-outline" size={20} color="#7f8c8d" />
          <Text style={styles.detailLabel}>Officer ID:</Text>
          <Text style={styles.detailValue}>{officer?.officer_id || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={20} color="#7f8c8d" />
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={styles.detailValue}>{officer?.email || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar-clock" size={20} color="#7f8c8d" />
          <Text style={styles.detailLabel}>Role:</Text>
          <Text style={styles.detailValue}>Officer</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Actions</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(officer)/bins')}>
          <MaterialCommunityIcons name="map" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>View Bins Map</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(officer)/dashboard')}>
          <MaterialCommunityIcons name="view-dashboard" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footerSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  officerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  officerId: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  officerEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
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
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 12,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#2ecc71',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    marginBottom: 0,
  },
  footerSpacer: {
    height: 20,
  },
});