from app.firebase_config import get_firestore
from app.models import BinUnit, BinMetadata
from sqlalchemy import select
from datetime import datetime

def get_bin_data_from_firebase():
    """Get bin data from Firebase Firestore"""
    db = get_firestore()
    
    # Reference to your bins collection
    bins_ref = db.collection('bins')
    
    # Get all documents
    docs = bins_ref.stream()
    
    bin_data = []
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        bin_data.append(data)
    
    return bin_data

async def sync_bins_from_firebase_to_postgres(db_session):
    """Sync bins from Firebase to PostgreSQL"""
    firebase_bins = get_bin_data_from_firebase()
    
    for bin_item in firebase_bins:
        # Update or insert into PostgreSQL
        from app.models import BinUnit, BinMetadata
        
        # Check if bin exists
        result = await db_session.execute(
            select(BinUnit).where(BinUnit.unit_id == bin_item.get('unit_id'))
        )
        existing_bin = result.scalar_one_or_none()
        
        if existing_bin:
            # Update existing bin metadata
            meta_result = await db_session.execute(
                select(BinMetadata).where(BinMetadata.bin_unit_id == existing_bin.id)
            )
            metadata = meta_result.scalar_one_or_none()
            
            if metadata:
                metadata.level = bin_item.get('level', 0)
                metadata.threshold = bin_item.get('threshold', 80)
                metadata.zone = bin_item.get('zone')
                metadata.last_cleaned = datetime.utcnow()
        else:
            # Create new bin (you may want to add this logic)
            # For now, skip creating new bins from Firebase
            pass
    
    await db_session.commit()