import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { getFirebaseBins } from '../../services/binService';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function BinsScreen() {
  const [firebaseBins, setFirebaseBins] = useState<any[]>([]);
  const [selectedBin, setSelectedBin] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const mapRef = useRef<MapView>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      // ✅ FIX: getFirebaseBins returns { status, count, data }
      const result = await getFirebaseBins();
      console.log('Full Firebase response:', result);
      
      if (result && result.data && Array.isArray(result.data)) {
        setFirebaseBins(result.data);
        console.log('Firebase bins loaded:', result.data.length, 'bins');
      } else {
        console.warn('No data in Firebase response:', result);
        setFirebaseBins([]);
      }
    } catch (error) {
      console.error('Failed to load bins:', error);
      Alert.alert('Error', 'Failed to load bins');
    } finally {
      setLoading(false);
    }
  };

  const centerOnBin = (bin: any) => {
    if (!bin.location?.lat || !bin.location?.long) {
      Alert.alert('Error', 'Cannot center on bin: missing location');
      return;
    }
    if (mapRef.current) {
      const region: Region = {
        latitude: bin.location.lat,
        longitude: bin.location.long,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(region, 1000);
    }
    setSelectedBin(bin);
    setModalVisible(true);
  };

  const renderFirebaseBinCard = ({ item }: { item: any }) => {
    // Calculate average fill level
    const avgLevel = Math.round(
      ((item.bin_1_level || 0) + (item.bin_2_level || 0) + (item.bin_3_level || 0)) / 3
    );

    return (
      <TouchableOpacity 
        onPress={() => centerOnBin(item)} 
        style={styles.firebaseBinCard}
      >
        <Text style={styles.binArea}>{item.unit_id || item.id}</Text>
        <Text style={styles.binDetail}>📊 Fill: {avgLevel}%</Text>
        <Text style={styles.binDetail}>
          Updated: {item.updated_at ? new Date(item.updated_at * 1000).toLocaleString() : 'N/A'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Firebase Bins Map</Text>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 8.7312,
          longitude: 77.6923,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {firebaseBins.map((bin, index) => {
          // Calculate average fill level
          const avgLevel = Math.round(
            ((bin.bin_1_level || 0) + (bin.bin_2_level || 0) + (bin.bin_3_level || 0)) / 3
          );

          if (!bin.location?.lat || !bin.location?.long) return null;

          return (
            <Marker
              key={index}
              coordinate={{
                latitude: bin.location.lat,
                longitude: bin.location.long,
              }}
              title={bin.unit_id || bin.id}
              description={`Fill: ${avgLevel}%`}
              onPress={() => centerOnBin(bin)}
              pinColor={avgLevel > 80 ? 'red' : 'green'}
            />
          );
        })}
      </MapView>

      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#7f8c8d" />
          <Text style={styles.listTitle}> Firebase Bins (tap to view)</Text>
        </View>
        <FlatList
          data={firebaseBins}
          horizontal
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderFirebaseBinCard}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No Firebase bins found</Text>
          }
        />
      </View>

      {/* Modal for Bin Details */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="trash-can" size={24} color="#2ecc71" />
              <Text style={styles.modalTitle}> Bin Details</Text>
            </View>
            {selectedBin && (
              <ScrollView>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="map-marker" size={18} color="#3498db" />
                  <Text style={styles.detailText}> Unit ID: {selectedBin.unit_id}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="card-outline" size={18} color="#3498db" />
                  <Text style={styles.detailText}> Firebase ID: {selectedBin.id}</Text>
                </View>
                
                {selectedBin.location && (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color="#3498db" />
                    <Text style={styles.detailText}>
                      Location: {selectedBin.location.lat}, {selectedBin.location.long}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="water-percent" size={18} color={selectedBin.bin_1_level > 80 ? '#e74c3c' : '#2ecc71'} />
                  <Text style={styles.detailText}>
                    bin_1: {selectedBin.bin_1_level || 0}%
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="water-percent" size={18} color={selectedBin.bin_2_level > 80 ? '#e74c3c' : '#2ecc71'} />
                  <Text style={styles.detailText}>
                    bin_2: {selectedBin.bin_2_level || 0}%
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="water-percent" size={18} color={selectedBin.bin_3_level > 80 ? '#e74c3c' : '#2ecc71'} />
                  <Text style={styles.detailText}>
                    bin_3: {selectedBin.bin_3_level || 0}%
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="clock-outline" size={18} color="#3498db" />
                  <Text style={styles.detailText}>
                    Updated: {selectedBin.updated_at ? new Date(selectedBin.updated_at * 1000).toLocaleString() : 'N/A'}
                  </Text>
                </View>
              </ScrollView>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.closeBtn]} 
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={16} color="#fff" />
                <Text style={styles.btnText}> Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  headerContainer: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  map: { flex: 1 },
  listContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 12,
    borderRadius: 12,
    margin: 16,
    maxHeight: 150,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  listTitle: { fontWeight: 'bold', fontSize: 14, color: '#2c3e50' },
  firebaseBinCard: {
    backgroundColor: '#e8f4fd',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    width: 160,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  binArea: { fontWeight: 'bold', marginBottom: 4, fontSize: 13, color: '#2c3e50' },
  binDetail: { fontSize: 11, color: '#7f8c8d', marginTop: 2 },
  emptyText: { color: '#95a5a6', textAlign: 'center', paddingVertical: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2c3e50',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#2c3e50',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalBtn: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  closeBtn: { backgroundColor: '#3498db' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 14, marginLeft: 4 },
});