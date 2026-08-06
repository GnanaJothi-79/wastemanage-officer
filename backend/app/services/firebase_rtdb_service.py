from firebase_admin import db
from typing import Dict, List, Any, Optional
import math

def get_all_bins_from_rtdb() -> List[Dict[str, Any]]:
    """Get all bin data from Firebase Realtime Database"""
    try:
        bins_ref = db.reference('/bins')
        bins_data = bins_ref.get()
        
        if not bins_data:
            print("No bins data found in Firebase")
            return []
        
        result = []
        for bin_id, bin_data in bins_data.items():
            if isinstance(bin_data, dict):
                bin_obj = {
                    'id': bin_id,
                    'unit_id': bin_data.get('unit_id', bin_id),
                    'location': bin_data.get('location', {}),
                    'updated_at': bin_data.get('updated_at'),
                }
                
                max_level = 0
                if 'bin_level' in bin_data:
                    bin_levels = bin_data.get('bin_level', {})
                    if isinstance(bin_levels, dict):
                        for level_key, level_data in bin_levels.items():
                            if isinstance(level_data, dict) and 'level' in level_data:
                                level = level_data.get('level', 0)
                                bin_obj[f'{level_key}_level'] = level
                                if level > max_level:
                                    max_level = level
                
                bin_obj['max_level'] = max_level
                result.append(bin_obj)
        
        return result
    except Exception as e:
        print(f"Error fetching bins from Realtime DB: {e}")
        return []

def get_bins_above_threshold_from_rtdb(threshold: int = 75) -> List[Dict[str, Any]]:
    """Get bins where max level exceeds threshold"""
    try:
        all_bins = get_all_bins_from_rtdb()
        overflow_bins = []
        for bin_data in all_bins:
            max_level = bin_data.get('max_level', 0)
            if max_level >= threshold:
                overflow_bins.append(bin_data)
        return overflow_bins
    except Exception as e:
        print(f"Error fetching overflow bins: {e}")
        return []

def get_bin_by_unit_id_from_rtdb(unit_id: str) -> Optional[Dict[str, Any]]:
    """Get a bin by unit_id from Firebase Realtime Database"""
    try:
        bins_ref = db.reference('/bins')
        bins_data = bins_ref.get()
        
        if not bins_data:
            return None
        
        for bin_id, bin_data in bins_data.items():
            if isinstance(bin_data, dict):
                if bin_data.get('unit_id') == unit_id:
                    result = {
                        'id': bin_id,
                        'unit_id': bin_data.get('unit_id', bin_id),
                        'location': bin_data.get('location', {}),
                        'updated_at': bin_data.get('updated_at'),
                    }
                    
                    max_level = 0
                    if 'bin_level' in bin_data:
                        bin_levels = bin_data.get('bin_level', {})
                        if isinstance(bin_levels, dict):
                            for level_key, level_data in bin_levels.items():
                                if isinstance(level_data, dict) and 'level' in level_data:
                                    level = level_data.get('level', 0)
                                    result[f'{level_key}_level'] = level
                                    if level > max_level:
                                        max_level = level
                    
                    result['max_level'] = max_level
                    return result
        
        return None
    except Exception as e:
        print(f"Error fetching bin by unit_id {unit_id}: {e}")
        return None