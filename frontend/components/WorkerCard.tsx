import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Worker {
  id?: number;
  worker_id: string;
  name: string;
  email: string;
  zone: string;
  status: string;
  lat: number;
  lng: number;
}

interface Props {
  worker: Worker;
  onView?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function WorkerCard({ worker, onView, onEdit, onDelete }: Props) {
  const parseZone = (zone: string) => {
    if (!zone) return null;
    const parts = zone.split('-');
    if (parts.length !== 3) return null;
    return { district: parts[0], village: parts[1], ward: parts[2] };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#2ecc71';
      case 'inactive': return '#e74c3c';
      case 'idle': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const parsedZone = parseZone(worker.zone);

  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{worker.name}</Text>
        <Text style={styles.id}>ID: {worker.worker_id}</Text>
        <Text style={styles.email}>Email: {worker.email}</Text>
        {parsedZone ? (
          <>
            <Text style={styles.zoneText}>🗺️ District: {parsedZone.district}</Text>
            <Text style={styles.zoneText}>📍 Village: {parsedZone.village}</Text>
            <Text style={styles.zoneText}>🏘️ Ward: {parsedZone.ward}</Text>
          </>
        ) : (
          <Text style={styles.zoneText}>Zone: {worker.zone}</Text>
        )}
        <View style={styles.statusContainer}>
          <Text>Status: </Text>
          <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(worker.status) }]}>
            {worker.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        {onView && (
          <TouchableOpacity onPress={onView} style={styles.viewBtn}>
            <Text style={styles.btnText}>👁️ View</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
          <Text style={styles.btnText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Text style={styles.btnText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginVertical: 6,
    elevation: 2,
  },
  info: { flex: 1 },
  name: { fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  id: { fontSize: 12, color: '#666' },
  email: { fontSize: 12, color: '#666', marginBottom: 4 },
  zoneText: { fontSize: 13, fontWeight: '500', color: '#2c3e50', marginTop: 2 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, fontSize: 12, fontWeight: 'bold', color: '#fff' },
  actions: { justifyContent: 'center', gap: 6 },
  viewBtn: { backgroundColor: '#3498db', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  editBtn: { backgroundColor: '#2ecc71', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  deleteBtn: { backgroundColor: '#e74c3c', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});