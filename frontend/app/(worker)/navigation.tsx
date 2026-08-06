import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { getRoute } from '../../services/routingService';

export default function NavigationScreen() {
  const { 
    binId, 
    binLocation, 
    binLat, 
    binLng, 
    binLevel, 
    binThreshold 
  } = useLocalSearchParams();
  
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  
  // Worker's current location (mock - in real app, use GPS)
  const workerLat = 12.9716;
  const workerLng = 77.5946;

  useEffect(() => {
    if (binLat && binLng) {
      const route = getRoute(workerLat, workerLng, parseFloat(binLat as string), parseFloat(binLng as string));
      const coords = route.routeCoords.map(c => ({ latitude: c.lat, longitude: c.lng }));
      setRouteCoords(coords);
    }
  }, [binLat, binLng]);

  const handleArrived = () => {
    Alert.alert(
      'Arrived at Bin',
      `Bin: ${binLocation}\nID: ${binId}\nFill Level: ${binLevel}%\nThreshold: ${binThreshold}%`,
      [
        { text: 'Not Yet', style: 'cancel' },
        { 
          text: 'Yes, Collected', 
          onPress: () => {
            Alert.alert('Success', 'Waste collected! Return to dashboard to update bin status.');
            router.back();
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Navigate to Bin</Text>
        <Text style={styles.binInfo}>📍 {binLocation}</Text>
        <Text style={styles.binId}>🆔 Bin ID: {binId}</Text>
        <View style={styles.binStats}>
          <Text style={styles.binStatsText}>📊 Fill Level: {binLevel}%</Text>
          <Text style={styles.binStatsText}>⚠️ Threshold: {binThreshold}%</Text>
        </View>
      </View>
      
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: workerLat,
          longitude: workerLng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={{ latitude: workerLat, longitude: workerLng }}
          title="You are here"
          pinColor="blue"
        />
        <Marker
          coordinate={{ 
            latitude: parseFloat(binLat as string), 
            longitude: parseFloat(binLng as string) 
          }}
          title="Target Bin"
          description={`${binLocation} - Level: ${binLevel}%`}
          pinColor="red"
        />
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#2ecc71"
            strokeWidth={4}
          />
        )}
      </MapView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.arrivedBtn} onPress={handleArrived}>
          <Text style={styles.btnText}>✅ I've Arrived at the Bin</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  binInfo: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 8,
  },
  binId: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  binStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  binStatsText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2c3e50',
  },
  map: { flex: 1 },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  arrivedBtn: {
    backgroundColor: '#2ecc71',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});