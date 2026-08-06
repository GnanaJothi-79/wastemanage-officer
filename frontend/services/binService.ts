import { API_BASE } from './api';

export interface Bin {
  id: number;
  unit_id: string;
  location: string;
  latitude: number;
  longitude: number;
  status: string;
  level: number;
  last_cleaned: string | null;
  threshold: number;
  zone: string | null;
  assigned_worker_name?: string;
  assigned_worker_id?: string;
}

export interface FirebaseBin {
  id: string;
  unit_id: string;
  location: { lat: number; long: number };
  updated_at: number;
  bin_1_level?: number;
  bin_2_level?: number;
  bin_3_level?: number;
  max_level?: number;
}

// ========== PostgreSQL Bin Functions ==========

export const getBins = async (): Promise<Bin[]> => {
  try {
    const response = await fetch(`${API_BASE}/bins/`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Get bins error:', response.status, errorText);
      throw new Error('Failed to fetch bins');
    }
    return await response.json();
  } catch (error) {
    console.error('Error in getBins:', error);
    throw error;
  }
};

export const getBinsByZone = async (zone: string): Promise<Bin[]> => {
  try {
    const allBins = await getBins();
    return allBins.filter(bin => bin.zone === zone);
  } catch (error) {
    console.error('Error in getBinsByZone:', error);
    throw error;
  }
};

export const updateBinMetadata = async (binUnitId: number, updates: {
  level?: number;
  zone?: string;
  threshold?: number;
  last_cleaned?: string;
}) => {
  try {
    console.log('Updating bin metadata:', { binUnitId, updates });
    
    const response = await fetch(`${API_BASE}/bins/${binUnitId}/metadata`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update bin metadata error:', response.status, errorText);
      throw new Error(`Failed to update bin metadata: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in updateBinMetadata:', error);
    throw error;
  }
};

export const getOverflowAlerts = async () => {
  try {
    const bins = await getBins();
    const overflow = bins.filter(bin => bin.level >= (bin.threshold || 80));
    return overflow.map(bin => ({
      binId: bin.unit_id,
      bin_unit_id: bin.id,
      id: bin.id,
      level: bin.level,
      zone: bin.zone,
      areaName: bin.location,
      threshold: bin.threshold
    }));
  } catch (error) {
    console.error('Error in getOverflowAlerts:', error);
    throw error;
  }
};

export const deleteBin = async (binUnitId: number) => {
  try {
    const response = await fetch(`${API_BASE}/bins/${binUnitId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Delete bin error:', response.status, errorText);
      throw new Error(errorText || 'Failed to delete bin');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in deleteBin:', error);
    throw error;
  }
};

// ========== Firebase Bin Functions ==========

export const getFirebaseBins = async (options?: {
  zone?: string;
  overflow?: boolean;
  threshold?: number;
}): Promise<{ status: string; count: number; data: FirebaseBin[] }> => {
  try {
    let url = `${API_BASE}/firebase/bins`;
    const params = new URLSearchParams();
    
    if (options?.zone) {
      params.append('zone', options.zone);
    }
    if (options?.overflow) {
      params.append('overflow', 'true');
    }
    if (options?.threshold) {
      params.append('threshold', options.threshold.toString());
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    console.log('📡 Fetching Firebase bins from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Firebase API error:', response.status, errorText);
      return {
        status: 'error',
        count: 0,
        data: []
      };
    }
    
    const result = await response.json();
    console.log('✅ Firebase API response:', result);
    
    return {
      status: result.status || 'success',
      count: result.count || 0,
      data: result.data || []
    };
  } catch (error) {
    console.error('❌ Error in getFirebaseBins:', error);
    return {
      status: 'error',
      count: 0,
      data: []
    };
  }
};

export const getFirebaseBinByUnitId = async (unitId: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE}/firebase/bins/unit/${unitId}`);
    if (!response.ok) {
      throw new Error('Bin not found in Firebase');
    }
    return await response.json();
  } catch (error) {
    console.error('Error in getFirebaseBinByUnitId:', error);
    throw error;
  }
};

// ✅ Sync Firebase bins to PostgreSQL (READ-ONLY - doesn't modify Firebase)
export const syncFirebaseToPostgres = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE}/firebase/sync-to-postgres`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to sync bins');
    }
    return await response.json();
  } catch (error) {
    console.error('Error in syncFirebaseToPostgres:', error);
    throw error;
  }
};