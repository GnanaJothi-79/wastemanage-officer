import { View, Text, TextInput, FlatList, StyleSheet, Alert, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { getWorkers, addWorker, updateWorker, deleteWorker, Worker } from '../../services/workerService';
import { getFirebaseBins } from '../../services/binService'; // ✅ Changed to Firebase
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

export default function WorkersScreen() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingWorker, setViewingWorker] = useState<Worker | null>(null);
  const [workerBins, setWorkerBins] = useState<any[]>([]);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  
  const [workerId, setWorkerId] = useState('');
  const [workerDbId, setWorkerDbId] = useState<number>(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [zone, setZone] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'idle'>('inactive');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);
  
  const load = async () => {
    const data = await getWorkers();
    setWorkers(data);
  };

  // ✅ UPDATED: Fetch Bins from Firebase and calculate average fill level
  const loadWorkerBins = async (zone: string) => {
    const allBins = await getFirebaseBins();
    
    // NOTE: Your Firebase bins do NOT currently have a 'zone' field yet.
    // To filter by zone, you must add a 'zone' field to your Firebase documents.
    // For now, I've left it as all bins so the UI doesn't break.
    const filteredBins = Array.isArray(allBins) ? allBins : [];
    
    // Format the Firebase bins to match the UI expectations
    const formattedBins = filteredBins.map((bin: any) => {
      const avgLevel = Math.round(
        (bin.bin_1_level + bin.bin_2_level + bin.bin_3_level) / 3
      );
      return {
        id: bin.unit_id || bin.id,
        unit_id: bin.unit_id || bin.id,
        location: bin.location ? `Lat: ${bin.location.lat}, Long: ${bin.location.long}` : 'Unknown',
        level: avgLevel,
        threshold: 80, // Default threshold for Firebase bins
        zone: zone // Assign the worker's zone for display
      };
    });

    setWorkerBins(formattedBins);
  };

  const resetForm = () => {
    setWorkerId('');
    setWorkerDbId(0);
    setName('');
    setEmail('');
    setPassword('');
    setZone('');
    setStatus('inactive');
    setLat('');
    setLng('');
  };

  const validateZoneFormat = (zoneStr: string) => {
    const pattern = /^([1-9]|[1-2][0-9]|3[0-5])-([1-9]|[1-9][0-9]{1,3}|[1-4][0-9]{3}|5000)-([1-9]|1[0-9]|2[0-5])$/;
    if (!pattern.test(zoneStr)) {
      Alert.alert('Invalid Zone', 'Zone must follow format: District-Village-Ward (e.g., 28-4555-2)\nDistrict: 1-35, Village: 1-5000, Ward: 1-25');
      return false;
    }
    return true;
  };

  const handleAdd = async () => {
    if (!workerId || !name || !email || !password || !zone) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (!validateZoneFormat(zone)) return;

    const newWorker: Worker = {
      worker_id: workerId,
      name: name,
      email: email,
      password: password,
      zone: zone,
      status: status,
      lat: lat ? parseFloat(lat) : 12.9716,
      lng: lng ? parseFloat(lng) : 77.5946,
    };

    setLoading(true);
    try {
      await addWorker(newWorker);
      Alert.alert('Success', `${name} added as a worker for zone ${zone}.`);
      resetForm();
      setModalVisible(false);
      load();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add worker');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingWorker) return;
    if (!name || !email || !zone) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (!validateZoneFormat(zone)) return;

    const updates: Partial<Worker> = {
      name: name,
      email: email,
      zone: zone,
      status: status,
      lat: lat ? parseFloat(lat) : editingWorker.lat,
      lng: lng ? parseFloat(lng) : editingWorker.lng,
    };
    
    if (password && password.trim() !== '') {
      updates.password = password;
    }

    setLoading(true);
    try {
      await updateWorker(workerDbId, updates);
      Alert.alert('Success', `${name} updated successfully.`);
      resetForm();
      setEditModalVisible(false);
      setEditingWorker(null);
      load();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update worker');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (workerId: string) => {
    Alert.alert('Delete Worker', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteWorker(workerId);
          load();
        }
      },
    ]);
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setWorkerId(worker.worker_id);
    setWorkerDbId(worker.id || 0);
    setName(worker.name);
    setEmail(worker.email);
    setPassword('');
    setZone(worker.zone);
    setStatus(worker.status);
    setLat(worker.lat?.toString() || '');
    setLng(worker.lng?.toString() || '');
    setEditModalVisible(true);
  };

  const handleView = async (worker: Worker) => {
    setViewingWorker(worker);
    await loadWorkerBins(worker.zone);
    setViewModalVisible(true);
  };

  const parseZoneForDisplay = (zone: string) => {
    if (!zone) return null;
    const parts = zone.split('-');
    if (parts.length === 3) {
      return { district: parts[0], village: parts[1], ward: parts[2] };
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#2ecc71';
      case 'inactive': return '#e74c3c';
      case 'idle': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'idle': return 'Idle';
      default: return status;
    }
  };

  const renderWorkerCard = ({ item }: { item: Worker }) => (
    <View style={styles.workerCard}>
      <View style={styles.workerInfo}>
        <Text style={styles.workerName}>{item.name}</Text>
        <Text style={styles.workerDetail}>
          <Ionicons name="card-outline" size={12} color="#7f8c8d" /> ID: {item.worker_id}
        </Text>
        <Text style={styles.workerDetail}>
          <MaterialCommunityIcons name="map-marker-outline" size={12} color="#7f8c8d" /> Zone: {item.zone}
        </Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      <View style={styles.workerActions}>
        <TouchableOpacity style={styles.viewBtn} onPress={() => handleView(item)}>
          <Ionicons name="eye-outline" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
          <MaterialCommunityIcons name="pencil-outline" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.worker_id)}>
          <MaterialCommunityIcons name="delete-outline" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderZoneBins = () => {
    if (workerBins.length === 0) {
      return (
        <View style={styles.noBinsContainer}>
          <MaterialCommunityIcons name="trash-can-outline" size={40} color="#95a5a6" />
          <Text style={styles.noBinsText}>No bins assigned to this zone yet.</Text>
        </View>
      );
    }
    return workerBins.map((bin) => (
      <View key={bin.id} style={styles.binItem}>
        <View style={styles.binItemHeader}>
          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#3498db" />
          <Text style={styles.binItemId}>{bin.unit_id}</Text>
        </View>
        <Text style={styles.binItemLocation}>
          <Ionicons name="location-outline" size={14} color="#7f8c8d" /> {bin.location}
        </Text>
        <View style={styles.binItemThreshold}>
          <Text style={styles.binLabel}>Fill Level:</Text>
          <Text style={[styles.binLevel, { color: bin.level >= 80 ? '#e74c3c' : '#2ecc71' }]}>
            {bin.level}%
          </Text>
        </View>
        <Text style={styles.binLabel}>
          <MaterialCommunityIcons name="alert-outline" size={12} color="#95a5a6" /> Threshold: {bin.threshold}%
        </Text>
      </View>
    ));
  };

  const zoneDetails = viewingWorker ? parseZoneForDisplay(viewingWorker.zone) : null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <LinearGradient
          colors={['#2ecc71', '#27ae60']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.addBtnGradient}
        >
          <Text style={styles.addBtnText}>+ Add New Worker</Text>
        </LinearGradient>
      </TouchableOpacity>

      <FlatList
        data={workers}
        keyExtractor={item => item.worker_id}
        renderItem={renderWorkerCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Worker Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Register New Worker</Text>
          <Text style={styles.modalSubtitle}>Format: District-Village-Ward (e.g., 28-4555-2)</Text>
          <Text style={styles.helperText}>District: 1-35, Village: 1-5000, Ward: 1-25</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="card-outline" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              placeholder="Worker ID *"
              value={workerId}
              onChangeText={setWorkerId}
              style={styles.input}
              placeholderTextColor="#bbb"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              placeholder="Full Name *"
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholderTextColor="#bbb"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              placeholder="Email *"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#bbb"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              placeholder="Password *"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              placeholderTextColor="#bbb"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              placeholder="Zone * (e.g., 28-4555-2)"
              value={zone}
              onChangeText={setZone}
              style={styles.input}
              placeholderTextColor="#bbb"
            />
          </View>
          
          <Text style={styles.label}>Status:</Text>
          <View style={styles.statusRow}>
            <TouchableOpacity
              style={[styles.statusBtn, status === 'active' && styles.activeStatus]}
              onPress={() => setStatus('active')}
            >
              <MaterialCommunityIcons name="check-circle" size={16} color={status === 'active' ? '#fff' : '#666'} />
              <Text style={[styles.statusBtnText, status === 'active' && styles.activeStatusText]}>Active</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusBtn, status === 'inactive' && styles.inactiveStatus]}
              onPress={() => setStatus('inactive')}
            >
              <MaterialCommunityIcons name="close-circle" size={16} color={status === 'inactive' ? '#fff' : '#666'} />
              <Text style={[styles.statusBtnText, status === 'inactive' && styles.inactiveStatusText]}>Inactive</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusBtn, status === 'idle' && styles.idleStatus]}
              onPress={() => setStatus('idle')}
            >
              <MaterialCommunityIcons name="clock-outline" size={16} color={status === 'idle' ? '#fff' : '#666'} />
              <Text style={[styles.statusBtnText, status === 'idle' && styles.idleStatusText]}>Idle</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Location (optional):</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="latitude" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              placeholder="Latitude (e.g., 12.9716)"
              value={lat}
              onChangeText={setLat}
              style={styles.input}
              keyboardType="numeric"
              placeholderTextColor="#bbb"
            />
          </View>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="longitude" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              placeholder="Longitude (e.g., 77.5946)"
              value={lng}
              onChangeText={setLng}
              style={styles.input}
              keyboardType="numeric"
              placeholderTextColor="#bbb"
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelModalBtn]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.saveModalBtn]}
              onPress={handleAdd}
              disabled={loading}
            >
              <Text style={styles.btnText}>{loading ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      {/* Edit Worker Modal */}
      <Modal visible={editModalVisible} animationType="slide">
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Edit Worker</Text>
          <Text style={styles.modalSubtitle}>Update worker information</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="card-outline" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              placeholder="Worker ID"
              value={workerId}
              editable={false}
              style={[styles.input, styles.disabledInput]}
              placeholderTextColor="#bbb"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              placeholder="Full Name *"
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholderTextColor="#bbb"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              placeholder="Email *"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#bbb"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              placeholder="New Password (leave blank to keep current)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              placeholderTextColor="#bbb"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              placeholder="Zone * (e.g., 28-4555-2)"
              value={zone}
              onChangeText={setZone}
              style={styles.input}
              placeholderTextColor="#bbb"
            />
          </View>
          
          <Text style={styles.label}>Status:</Text>
          <View style={styles.statusRow}>
            <TouchableOpacity
              style={[styles.statusBtn, status === 'active' && styles.activeStatus]}
              onPress={() => setStatus('active')}
            >
              <MaterialCommunityIcons name="check-circle" size={16} color={status === 'active' ? '#fff' : '#666'} />
              <Text style={[styles.statusBtnText, status === 'active' && styles.activeStatusText]}>Active</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusBtn, status === 'inactive' && styles.inactiveStatus]}
              onPress={() => setStatus('inactive')}
            >
              <MaterialCommunityIcons name="close-circle" size={16} color={status === 'inactive' ? '#fff' : '#666'} />
              <Text style={[styles.statusBtnText, status === 'inactive' && styles.inactiveStatusText]}>Inactive</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusBtn, status === 'idle' && styles.idleStatus]}
              onPress={() => setStatus('idle')}
            >
              <MaterialCommunityIcons name="clock-outline" size={16} color={status === 'idle' ? '#fff' : '#666'} />
              <Text style={[styles.statusBtnText, status === 'idle' && styles.idleStatusText]}>Idle</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Location:</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="latitude" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              placeholder="Latitude"
              value={lat}
              onChangeText={setLat}
              style={styles.input}
              keyboardType="numeric"
              placeholderTextColor="#bbb"
            />
          </View>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="longitude" size={20} color="#95a5a6" style={styles.inputIcon} />
            <TextInput
              placeholder="Longitude"
              value={lng}
              onChangeText={setLng}
              style={styles.input}
              keyboardType="numeric"
              placeholderTextColor="#bbb"
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelModalBtn]}
              onPress={() => {
                setEditModalVisible(false);
                setEditingWorker(null);
                resetForm();
              }}
            >
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.saveModalBtn]}
              onPress={handleUpdate}
              disabled={loading}
            >
              <Text style={styles.btnText}>{loading ? 'Updating...' : 'Update'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      {/* View Worker Modal */}
      <Modal visible={viewModalVisible} animationType="slide" onRequestClose={() => setViewModalVisible(false)}>
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Worker Details</Text>
          
          {viewingWorker && (
            <>
              <View style={styles.viewSection}>
                <View style={styles.viewRow}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.viewIcon} />
                  <Text style={styles.viewLabel}>Name:</Text>
                  <Text style={styles.viewValue}>{viewingWorker.name}</Text>
                </View>
                
                <View style={styles.viewRow}>
                  <Ionicons name="card-outline" size={20} color="#666" style={styles.viewIcon} />
                  <Text style={styles.viewLabel}>Worker ID:</Text>
                  <Text style={styles.viewValue}>{viewingWorker.worker_id}</Text>
                </View>
                
                <View style={styles.viewRow}>
                  <Ionicons name="mail-outline" size={20} color="#666" style={styles.viewIcon} />
                  <Text style={styles.viewLabel}>Email:</Text>
                  <Text style={styles.viewValue}>{viewingWorker.email}</Text>
                </View>
                
                <View style={styles.viewRow}>
                  <MaterialCommunityIcons name="badge-account" size={20} color="#666" style={styles.viewIcon} />
                  <Text style={styles.viewLabel}>Status:</Text>
                  <Text style={[styles.viewValue, { color: getStatusColor(viewingWorker.status), fontWeight: '600' }]}>
                    {getStatusText(viewingWorker.status).toUpperCase()}
                  </Text>
                </View>
                
                <View style={styles.viewRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={20} color="#666" style={styles.viewIcon} />
                  <Text style={styles.viewLabel}>Zone:</Text>
                  {zoneDetails ? (
                    <View style={styles.zoneDetails}>
                      <Text style={styles.viewValue}>District Code: {zoneDetails.district}</Text>
                      <Text style={styles.viewValue}>Village Code: {zoneDetails.village}</Text>
                      <Text style={styles.viewValue}>Ward: {zoneDetails.ward}</Text>
                    </View>
                  ) : (
                    <Text style={styles.viewValue}>
                      {viewingWorker.zone || 'Not assigned'}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color="#2c3e50" />
                <Text style={styles.sectionTitle}> Bins in this Zone</Text>
              </View>
              <ScrollView style={styles.binsList} showsVerticalScrollIndicator={false}>
                {renderZoneBins()}
              </ScrollView>
            </>
          )}

          <TouchableOpacity
            style={styles.closeModalBtn}
            onPress={() => setViewModalVisible(false)}
          >
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  addBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2ecc71',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  addBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  workerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  workerDetail: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  workerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewBtn: {
    backgroundColor: '#3498db',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
  },
  editBtn: {
    backgroundColor: '#2ecc71',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
  },
  deleteBtn: {
    backgroundColor: '#e74c3c',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#2c3e50',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    marginVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  inputIcon: {
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    gap: 6,
  },
  statusBtnText: {
    fontSize: 14,
    color: '#666',
  },
  activeStatus: {
    backgroundColor: '#2ecc71',
  },
  inactiveStatus: {
    backgroundColor: '#e74c3c',
  },
  idleStatus: {
    backgroundColor: '#f39c12',
  },
  activeStatusText: {
    color: '#fff',
  },
  inactiveStatusText: {
    color: '#fff',
  },
  idleStatusText: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelModalBtn: {
    backgroundColor: '#95a5a6',
  },
  saveModalBtn: {
    backgroundColor: '#2ecc71',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // View Modal Styles
  viewSection: {
    marginBottom: 16,
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  viewIcon: {
    marginRight: 8,
  },
  viewLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    width: 100,
  },
  viewValue: {
    fontSize: 15,
    color: '#2c3e50',
    flex: 1,
  },
  zoneDetails: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  binsList: {
    maxHeight: 350,
  },
  binItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  binItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  binItemId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  binItemLocation: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 6,
  },
  binItemThreshold: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  binLabel: {
    fontSize: 12,
    color: '#95a5a6',
  },
  binLevel: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  noBinsContainer: {
    padding: 30,
    alignItems: 'center',
  },
  noBinsText: {
    color: '#95a5a6',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  closeModalBtn: {
    backgroundColor: '#3498db',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});