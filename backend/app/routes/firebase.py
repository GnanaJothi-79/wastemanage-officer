from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import Optional
from app.database import get_db
from app.models import BinUnit, BinMetadata
from app.services.firebase_rtdb_service import (
    get_all_bins_from_rtdb,
    get_bins_above_threshold_from_rtdb,
    get_bin_by_unit_id_from_rtdb
)

router = APIRouter(prefix="/firebase", tags=["firebase"])

# ==========================================================
# HELPER: Auto-sync Firebase bins to PostgreSQL
# ==========================================================
async def auto_sync_to_postgres(firebase_bins: list, db: AsyncSession):
    """Auto-sync Firebase bins to PostgreSQL without manual sync"""
    try:
        updated_count = 0
        created_count = 0
        
        for fb_bin in firebase_bins:
            unit_id = fb_bin.get('unit_id')
            max_level = fb_bin.get('max_level', 0)
            
            if not unit_id:
                continue
            
            # Find bin in PostgreSQL
            bin_result = await db.execute(
                select(BinUnit).where(BinUnit.unit_id == unit_id)
            )
            bin_unit = bin_result.scalar_one_or_none()
            
            if bin_unit:
                # Check if metadata exists
                meta_result = await db.execute(
                    select(BinMetadata).where(BinMetadata.bin_unit_id == bin_unit.id)
                )
                metadata = meta_result.scalar_one_or_none()
                
                if metadata:
                    # Update existing metadata
                    if metadata.level != max_level:
                        metadata.level = max_level
                        metadata.last_cleaned = datetime.utcnow()
                        updated_count += 1
                        print(f"✅ Auto-updated bin {unit_id}: level → {max_level}")
                else:
                    # Create new metadata
                    new_metadata = BinMetadata(
                        bin_unit_id=bin_unit.id,
                        level=max_level,
                        threshold=80,
                        last_cleaned=datetime.utcnow(),
                        zone='28-4555-2'
                    )
                    db.add(new_metadata)
                    created_count += 1
                    print(f"✅ Auto-created metadata for bin {unit_id} with level {max_level}")
        
        if updated_count > 0 or created_count > 0:
            await db.commit()
            print(f"📊 Auto-sync: {updated_count} updated, {created_count} created")
            
    except Exception as e:
        print(f"⚠️ Auto-sync error: {e}")
        await db.rollback()

# ==========================================================
# GET /firebase/bins - Get bins from Firebase (auto-sync)
# ==========================================================
@router.get("/bins")
async def get_firebase_bins(
    zone: Optional[str] = Query(None, description="Filter by zone"),
    overflow: Optional[bool] = Query(False, description="Get only overflow bins"),
    threshold: Optional[int] = Query(75, description="Threshold for overflow"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get bins from Firebase Realtime Database.
    Auto-syncs to PostgreSQL when bins are fetched.
    """
    try:
        print("=== Firebase Bins Request ===")
        
        # Get bins from Firebase
        if overflow:
            bins = get_bins_above_threshold_from_rtdb(threshold)
        else:
            bins = get_all_bins_from_rtdb()
        
        print(f"Found {len(bins)} bins from Firebase")
        
        # Auto-sync to PostgreSQL (READ-ONLY - doesn't modify Firebase)
        if bins:
            await auto_sync_to_postgres(bins, db)
        
        return {
            "status": "success",
            "count": len(bins),
            "data": bins
        }
    except Exception as e:
        print(f"Error fetching Firebase bins: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================================
# POST /firebase/sync-to-postgres - Manual sync
# ==========================================================
@router.post("/sync-to-postgres")
async def sync_firebase_to_postgres(db: AsyncSession = Depends(get_db)):
    """
    Manual sync Firebase bin data to PostgreSQL.
    """
    try:
        print("🔄 Manual sync started...")
        firebase_bins = get_all_bins_from_rtdb()
        await auto_sync_to_postgres(firebase_bins, db)
        
        return {
            "status": "success",
            "message": "Sync completed successfully"
        }
    except Exception as e:
        print(f"❌ Sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================================
# GET /firebase/bins/overflow - Get overflow bins
# ==========================================================
@router.get("/bins/overflow")
async def get_overflow_bins(threshold: int = Query(75, description="Threshold for overflow")):
    """Get bins that exceed the threshold"""
    try:
        bins = get_bins_above_threshold_from_rtdb(threshold)
        return {
            "status": "success",
            "count": len(bins),
            "data": bins
        }
    except Exception as e:
        print(f"Error fetching overflow bins: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================================
# GET /firebase/bins/unit/{unit_id} - Get bin by unit_id
# ==========================================================
@router.get("/bins/unit/{unit_id}")
async def get_firebase_bin_by_unit_id(unit_id: str):
    """Get a bin by unit_id from Firebase Realtime Database"""
    try:
        bin_data = get_bin_by_unit_id_from_rtdb(unit_id)
        if not bin_data:
            raise HTTPException(status_code=404, detail=f"Bin {unit_id} not found in Firebase")
        
        return {
            "status": "success",
            "data": bin_data
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching bin by unit_id: {e}")
        raise HTTPException(status_code=500, detail=str(e))