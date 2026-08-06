import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { API_BASE } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function WorkerTrackingScreen() {
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [workerStringId, setWorkerStringId] = useState<string | null>(null); // ✅ Store both IDs
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [intervalId, setIntervalId] = useState<any>(null);

  // Get worker ID on load
  useEffect(() => {
    const getWorkerId = async () => {
      const workerData = await AsyncStorage.getItem('worker');
      if (workerData) {
        const worker = JSON.parse(workerData);
        console.log('Worker data from storage:', worker);
        
        // ✅ Store both IDs
        setWorkerId(worker.id?.toString());  // Database ID (2)
        setWorkerStringId(worker.worker_id); // String ID ("1002")
      }
    };
    getWorkerId();
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        setIsTracking(false);
      }
    };
  }, [intervalId]);

  const startTracking = async () => {
    // ✅ Check both IDs
    if (!workerId && !workerStringId) {
      Alert.alert('Error', 'Worker ID not found. Please login again.');
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required for tracking.');
      return;
    }

    setIsTracking(true);
    
    await sendLocation();
    
    const id = setInterval(sendLocation, 10000);
    setIntervalId(id);
    Alert.alert('Tracking Started', 'Your location is now being tracked every 10 seconds.');
  };

  const stopTracking = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsTracking(false);
    Alert.alert('Tracking Stopped', 'Location tracking has been stopped.');
  };

  const sendLocation = async () => {
    try {
      // ✅ Try with string ID first, then numeric ID
      const idToSend = workerStringId || workerId;
      
      if (!idToSend) {
        console.error('No worker ID available');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });
      setLastUpdate(new Date().toLocaleTimeString());

      console.log(`Sending location: ${latitude}, ${longitude} for worker ${idToSend}`);

      const response = await fetch(`${API_BASE}/workers/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: idToSend, // ✅ Send the string ID
          latitude: latitude,
          longitude: longitude
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update location:', errorText);
        
        // If worker not found with string ID, try numeric ID
        if (errorText.includes('Worker not found') && workerStringId) {
          console.log('Retrying with numeric ID:', workerId);
          const retryResponse = await fetch(`${API_BASE}/workers/location`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              worker_id: workerId, // ✅ Try numeric ID
              latitude: latitude,
              longitude: longitude
            })
          });
          if (!retryResponse.ok) {
            console.error('Retry failed:', await retryResponse.text());
          }
        }
      }
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return dateString;
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>📍 GPS Tracking</Text>
        <Text style={styles.subtitle}>Worker ID: {workerStringId || workerId || 'Not set'}</Text>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, isTracking ? styles.active : styles.inactive]} />
          <Text style={styles.statusText}>
            {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
          </Text>
        </View>

        {currentLocation && (
          <View style={styles.locationContainer}>
            <Text style={styles.locationLabel}>📍 Current Location:</Text>
            <Text style={styles.locationText}>
              Lat: {currentLocation.latitude.toFixed(6)}
            </Text>
            <Text style={styles.locationText}>
              Lng: {currentLocation.longitude.toFixed(6)}
            </Text>
            <Text style={styles.locationText}>
              Last Update: {formatDate(lastUpdate)}
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {!isTracking ? (
            <TouchableOpacity style={[styles.button, styles.startButton]} onPress={startTracking}>
              <Ionicons name="play-circle" size={24} color="#fff" />
              <Text style={styles.buttonText}>Start Tracking</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={stopTracking}>
              <Ionicons name="stop-circle" size={24} color="#fff" />
              <Text style={styles.buttonText}>Stop Tracking</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.sendButton} onPress={sendLocation}>
          <MaterialCommunityIcons name="send" size={20} color="#3498db" />
          <Text style={styles.sendButtonText}>Send Location Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f5f7fa',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#2c3e50', 
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: { 
    fontSize: 14, 
    color: '#7f8c8d', 
    textAlign: 'center',
    marginBottom: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  active: { backgroundColor: '#2ecc71' },
  inactive: { backgroundColor: '#e74c3c' },
  statusText: { fontSize: 16, fontWeight: '500', color: '#2c3e50' },
  locationContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  locationLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#2c3e50', 
    marginBottom: 6 
  },
  locationText: { 
    fontSize: 14, 
    color: '#7f8c8d', 
    marginBottom: 2 
  },
  buttonContainer: {
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  startButton: { backgroundColor: '#2ecc71' },
  stopButton: { backgroundColor: '#e74c3c' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3498db',
    gap: 8,
  },
  sendButtonText: { color: '#3498db', fontWeight: '500', fontSize: 14 },
});