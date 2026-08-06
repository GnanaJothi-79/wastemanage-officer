import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { API_BASE } from '../../services/api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface RouteData {
  geometry: number[][];
  distance: number;
  duration: number;
}

export default function NavigationScreen() {
  const { binId, binLocation, binLat, binLng } = useLocalSearchParams();
  const [routeCoords, setRouteCoords] = useState<Coordinate[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Worker's current location (from GPS)
  const startLat = 8.39733790675814;
  const startLng = 77.59778201580048;
  
  const endLat = parseFloat(binLat as string);
  const endLng = parseFloat(binLng as string);

  useEffect(() => {
    getRouteFromAPI();
  }, []);

  const getRouteFromAPI = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📍 Start location:', startLat, startLng);
      console.log('📍 End location:', endLat, endLng);
      
      const response = await fetch(`${API_BASE}/routing/directions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_lat: startLat,
          start_lng: startLng,
          end_lat: endLat,
          end_lng: endLng
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Route API error:', response.status, errorText);
        throw new Error('Route fetch failed');
      }
      
      const data = await response.json() as RouteData;
      console.log('✅ Route data received:', data);
      
      let coords: Coordinate[] = [];
      
      if (data.geometry && Array.isArray(data.geometry) && data.geometry.length > 0) {
        coords = data.geometry.map((point: number[]) => {
          if (Array.isArray(point) && point.length >= 2) {
            return {
              latitude: point[0],
              longitude: point[1]
            };
          }
          return { latitude: 0, longitude: 0 };
        }).filter((coord: Coordinate) => coord.latitude !== 0 && coord.longitude !== 0);
      }
      
      if (coords.length < 2) {
        console.log('⚠️ No route from API, generating fallback path');
        coords = generatePathWithWaypoints(startLat, startLng, endLat, endLng, 25);
      }
      
      console.log('📍 Route coordinates count:', coords.length);
      console.log('📍 First coord:', coords[0]);
      console.log('📍 Last coord:', coords[coords.length - 1]);
      
      setRouteCoords(coords);
      setRouteInfo({
        distance: data.distance ? (data.distance / 1000).toFixed(2) : calculateDistance(startLat, startLng, endLat, endLng).toFixed(2),
        duration: data.duration ? Math.round(data.duration / 60) : Math.round(calculateDistance(startLat, startLng, endLat, endLng) / 1.4 / 60)
      });
      
    } catch (err) {
      console.error('❌ Error fetching route:', err);
      setError('Showing direct path.');
      
      const pathCoords = generatePathWithWaypoints(startLat, startLng, endLat, endLng, 25);
      setRouteCoords(pathCoords);
      
      const distance = calculateDistance(startLat, startLng, endLat, endLng);
      setRouteInfo({
        distance: distance.toFixed(2),
        duration: Math.round(distance / 1.4 / 60)
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePathWithWaypoints = (lat1: number, lon1: number, lat2: number, lon2: number, numPoints: number = 20): Coordinate[] => {
    const points: Coordinate[] = [];
    
    // Calculate midpoint for curve
    const midLat = (lat1 + lat2) / 2;
    const midLon = (lon1 + lon2) / 2;
    
    // Calculate perpendicular offset for a smoother curve
    const dx = lon2 - lon1;
    const dy = lat2 - lat1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    let offsetLat = 0;
    let offsetLon = 0;
    
    if (length > 0) {
      // Perpendicular direction
      const perpX = -dy / length;
      const perpY = dx / length;
      
      // Curve intensity based on distance (max 0.05 degrees ~ 5.5km)
      const curveIntensity = Math.min(0.05, length * 0.1);
      
      offsetLat = perpY * curveIntensity;
      offsetLon = perpX * curveIntensity;
    }
    
    // Generate bezier curve points
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      // Quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
      const lat = (1-t)**2 * lat1 + 2*(1-t)*t * (midLat + offsetLat) + t**2 * lat2;
      const lon = (1-t)**2 * lon1 + 2*(1-t)*t * (midLon + offsetLon) + t**2 * lon2;
      points.push({ latitude: lat, longitude: lon });
    }
    
    return points;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} hr ${mins} min`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2ecc71" />
        <Text style={styles.loadingText}>Finding the best route...</Text>
      </View>
    );
  }

  // Calculate map region to show both points
  const minLat = Math.min(startLat, endLat);
  const maxLat = Math.max(startLat, endLat);
  const minLng = Math.min(startLng, endLng);
  const maxLng = Math.max(startLng, endLng);
  
  const region = {
    latitude: (startLat + endLat) / 2,
    longitude: (startLng + endLng) / 2,
    latitudeDelta: Math.abs(maxLat - minLat) + 0.02,
    longitudeDelta: Math.abs(maxLng - minLng) + 0.02,
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Navigate to Bin</Text>
        <Text style={styles.binInfo}>📍 {binLocation}</Text>
        <Text style={styles.binId}>Bin ID: {binId}</Text>
        
        {routeInfo && (
          <View style={styles.routeInfo}>
            <View style={styles.routeInfoItem}>
              <MaterialCommunityIcons name="map-marker-distance" size={20} color="#2ecc71" />
              <Text style={styles.routeInfoText}>{routeInfo.distance} km</Text>
            </View>
            <View style={styles.routeInfoItem}>
              <MaterialCommunityIcons name="clock-outline" size={20} color="#3498db" />
              <Text style={styles.routeInfoText}>{formatDuration(routeInfo.duration)}</Text>
            </View>
          </View>
        )}
        
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <MapView
        style={styles.map}
        initialRegion={region}
        mapType="standard"
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Start Marker - Worker Location */}
        <Marker
          coordinate={{ latitude: startLat, longitude: startLng }}
          title="Your Location"
          pinColor="blue"
        />
        
        {/* Destination Marker - Bin */}
        <Marker
          coordinate={{ latitude: endLat, longitude: endLng }}
          title={binLocation as string}
          description={`Bin ID: ${binId}`}
          pinColor="red"
        />
        
        {/* Route Polyline */}
        {routeCoords.length >= 2 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#2ecc71"
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backButtonText}>Back to Task</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.refreshButton} onPress={getRouteFromAPI}>
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.refreshButtonText}>Refresh Route</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f7fa' 
  },
  centerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 12, 
    color: '#7f8c8d', 
    fontSize: 14 
  },
  header: { 
    padding: 16, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#2c3e50' 
  },
  binInfo: { 
    fontSize: 16, 
    color: '#7f8c8d', 
    marginTop: 8 
  },
  binId: { 
    fontSize: 12, 
    color: '#95a5a6', 
    marginTop: 2 
  },
  routeInfo: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginTop: 12, 
    paddingTop: 8, 
    borderTopWidth: 1, 
    borderTopColor: '#eee' 
  },
  routeInfoItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  routeInfoText: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#2c3e50' 
  },
  errorText: { 
    fontSize: 12, 
    color: '#e74c3c', 
    marginTop: 8, 
    textAlign: 'center' 
  },
  map: { 
    flex: 1, 
    margin: 10, 
    borderRadius: 12 
  },
  footer: { 
    flexDirection: 'row', 
    gap: 12, 
    padding: 16, 
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderTopColor: '#eee' 
  },
  backButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#3498db', 
    paddingVertical: 12, 
    borderRadius: 10, 
    gap: 8 
  },
  backButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 14 
  },
  refreshButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#2ecc71', 
    paddingVertical: 12, 
    borderRadius: 10, 
    gap: 8 
  },
  refreshButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 14 
  },
});