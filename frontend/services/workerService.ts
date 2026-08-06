import { API_BASE } from './api';

export interface Worker {
  id?: number;
  worker_id: string;
  name: string;
  email: string;
  password?: string; // Optional because backend usually doesn't return it
  zone: string;
  status: 'active' | 'inactive' | 'idle';
  lat?: number | null;        // Made optional, as it may fallback to real-time
  lng?: number | null;        // Made optional, as it may fallback to real-time
  // --- NEW: Real-time GPS fields returned from the backend ---
  current_latitude?: number | null;
  current_longitude?: number | null;
  last_location_update?: string | null;
}

// ==========================================================
// GET ALL WORKERS (Now includes current_latitude/current_longitude)
// ==========================================================
export const getWorkers = async (): Promise<Worker[]> => {
  const response = await fetch(`${API_BASE}/workers/`);
  if (!response.ok) throw new Error('Failed to fetch workers');
  
  const data = await response.json();

  // Map the backend response to ensure 'lat' and 'lng' always exist
  // (If real-time GPS is available, use it; otherwise fallback to original lat/lng)
  return data.map((worker: any) => ({
    ...worker,
    // This creates a unified 'latitude' and 'longitude' for the dashboard
    latitude: worker.current_latitude ?? worker.lat,     
    longitude: worker.current_longitude ?? worker.lng,    
    // Ensure these fields exist for TypeScript compatibility
    current_latitude: worker.current_latitude ?? null,
    current_longitude: worker.current_longitude ?? null,
    status: worker.status || 'active',
    lat: worker.current_latitude ?? worker.lat,   // Updates fallback
    lng: worker.current_longitude ?? worker.lng,  // Updates fallback
  }));
};

// ==========================================================
// ADD A NEW WORKER
// ==========================================================
export const addWorker = async (worker: Omit<Worker, 'id'>): Promise<Worker> => {
  // The backend expects 'worker_id', NOT 'id', and does NOT expect 'password' in create requests
  const payload = {
    worker_id: worker.worker_id,
    name: worker.name,
    email: worker.email,
    zone: worker.zone,
    status: worker.status,
    lat: worker.lat,
    lng: worker.lng,
  };

  const response = await fetch(`${API_BASE}/workers/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to add worker');
  }
  return response.json();
};

// ==========================================================
// UPDATE WORKER
// ==========================================================
export const updateWorker = async (identifier: string | number, updates: Partial<Worker>): Promise<Worker> => {
  console.log(`Updating worker with identifier: '${identifier}'`);
  console.log(`URL: ${API_BASE}/workers/${identifier}`);
  console.log(`Body:`, JSON.stringify(updates));
  
  const response = await fetch(`${API_BASE}/workers/${identifier}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  
  console.log(`Response status: ${response.status}`);
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`Error response: ${error}`);
    throw new Error(error || 'Failed to update worker');
  }
  
  const data = await response.json();
  console.log(`Success:`, data);
  return data;
};

// ==========================================================
// DELETE WORKER
// ==========================================================
export const deleteWorker = async (workerId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/workers/${workerId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete worker');
};