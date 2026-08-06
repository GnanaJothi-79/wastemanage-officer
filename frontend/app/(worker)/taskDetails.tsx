import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Button, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { getFirebaseBins } from '../../services/binService'; // Firebase only
import { getRoute } from '../../services/routingService';
import { API_BASE } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TaskDetails() {
  const { taskId, binId, binLat, binLng } = useLocalSearchParams();
  
  const [task, setTask] = useState<any>(null);
  const [bin, setBin] = useState<any>(null);
  const [workerLat, setWorkerLat] = useState<number>(12.9716); // Default fallback
  const [workerLng, setWorkerLng] = useState<number>(77.5946); // Default fallback
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Get Worker's Live GPS & Task Details
  useEffect(() => {
    const load = async () => {
      try {
        // Get the worker's live location from your PostgreSQL DB
        const workerId = await AsyncStorage.getItem('worker_id');
        if (workerId) {
          const workerRes = await fetch(`${API_BASE}/workers/${workerId}`);
          if (workerRes.ok) {
            const workerData = await workerRes.json();
            // Use real-time GPS if available, otherwise fallback to original lat/lng
            setWorkerLat(workerData.current_latitude ?? workerData.lat);
            setWorkerLng(workerData.current_longitude ?? workerData.lng);
          }
        }

        // 2. Fetch Task Details
        const tasksRes = await fetch(`${API_BASE}/tasks/worker/${workerId}`);
        if (tasksRes.ok) {
          const tasks = await tasksRes.json();
          // Find the task by ID sent from the dashboard
          const foundTask = tasks.find((t: any) => t.id == taskId || t.task_id == taskId);
          setTask(foundTask);
        }

        // 3. Fetch Bin Details from Firebase
        const fbBins = await getFirebaseBins();
        let foundBin = null;
        if (Array.isArray(fbBins)) {
          // If we have binId passed from params, find that specific Firebase bin
          foundBin = fbBins.find((b: any) => b.unit_id === binId || b.id === binId);
          
          // If not found by unit_id, use the lat/lng passed from params
          if (!foundBin && binLat && binLng) {
            foundBin = {
              unit_id: binId,
              location: { lat: parseFloat(binLat as string), long: parseFloat(binLng as string) }
            };
          }
        }
        setBin(foundBin);

        // 4. Calculate Navigation Route
        if (foundBin) {
          const binLatNum = foundBin.location?.lat || parseFloat(binLat as string);
          const binLngNum = foundBin.location?.long || parseFloat(binLng as string);
          
          if (workerLat && workerLng && binLatNum && binLngNum) {
            const route = getRoute(workerLat, workerLng, binLatNum, binLngNum);
            const coords = route.routeCoords.map((c: any) => ({ 
              latitude: c.lat, 
              longitude: c.lng 
            }));
            setRouteCoords(coords);
          }
        }
      } catch (error) {
        console.error("Error loading task details:", error);
        Alert.alert('Error', 'Failed to load task details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [taskId, binId, binLat, binLng]);

  // 2. Complete the Task
  const completeTask = async () => {
    if (!image) { 
      Alert.alert('Error', 'Please upload a completion photo'); 
      return; 
    }
    
    try {
      // Update Task Status to 'completed' via Backend
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // (Optional) If you want to reset the Firebase bin level to 0, you need a custom backend endpoint for that.
      // Currently your Firebase is read-only from the frontend.
      
      Alert.alert('Success', 'Task Completed! Thank you for your hard work.');
      router.back(); // Navigate back to the Worker Dashboard
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to complete task');
    }
  };

  // 3. Pick Image from Gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  if (loading) {
    return <Text style={styles.loading}>Loading task details...</Text>;
  }

  if (!bin) {
    return <Text style={styles.loading}>Bin not found in Firebase.</Text>;
  }

  const binLatNum = bin.location?.lat || parseFloat(binLat as string);
  const binLngNum = bin.location?.long || parseFloat(binLng as string);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Navigate to Bin {bin.unit_id || binId}</Text>
      
      {/* Map View */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: workerLat,
          longitude: workerLng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Bin Marker */}
        {binLatNum && binLngNum && (
          <Marker
            coordinate={{ latitude: binLatNum, longitude: binLngNum }}
            title={bin.unit_id || 'Bin'}
            pinColor="red"
          />
        )}
        
        {/* Worker Marker */}
        <Marker
          coordinate={{ latitude: workerLat, longitude: workerLng }}
          title="Your Location"
          pinColor="#2ecc71"
        />
        
        {/* Route Polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#2ecc71"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Completion Area */}
      <View style={styles.completeArea}>
        <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
          <Text style={styles.photoBtnText}>📸 Upload Completion Photo</Text>
        </TouchableOpacity>
        
        {image && <Image source={{ uri: image }} style={styles.preview} />}
        
        <Button title="✅ Mark Completed" onPress={completeTask} color="#2ecc71" />
        
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>Cancel & Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  loading: { flex: 1, textAlign: 'center', marginTop: 50, fontSize: 16, color: '#7f8c8d' },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginVertical: 12, color: '#2c3e50' },
  map: { flex: 1 },
  completeArea: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  photoBtn: { 
    backgroundColor: '#ecf0f1', 
    padding: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginBottom: 12 
  },
  photoBtnText: { fontSize: 16, color: '#2c3e50' },
  preview: { width: 120, height: 120, alignSelf: 'center', marginBottom: 12, borderRadius: 8 },
  backBtn: {
    marginTop: 12,
    alignItems: 'center',
    padding: 10,
  },
  backBtnText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
});