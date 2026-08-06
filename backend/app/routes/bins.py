from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.database import get_db
from app.models import BinUnit, BinMetadata, Worker, Task
from app.schemas import BinUnitResponse, BinMetadataUpdate, BinUnitCreate
import re

router = APIRouter(prefix="/bins", tags=["bins"])

def validate_zone_format(zone: str) -> bool:
    pattern = r'^([1-9]|[1-2][0-9]|3[0-5])-([1-9]|[1-9][0-9]{1,3}|[1-4][0-9]{3}|5000)-([1-9]|1[0-9]|2[0-5])$'
    return re.match(pattern, zone) is not None

async def auto_create_task(bin_unit_id: int, zone: str, level: int, threshold: int, db: AsyncSession):
    """Auto create task if bin level exceeds threshold"""
    if level >= threshold:
        try:
            # Check if there's already a pending task for this bin
            existing_task_result = await db.execute(
                select(Task).where(
                    Task.bin_unit_id == bin_unit_id, 
                    Task.status.in_(['pending', 'in-progress'])
                )
            )
            existing_task = existing_task_result.scalar_one_or_none()
            if existing_task:
                print(f"Task already exists for bin {bin_unit_id}")
                return None
            
            # Find worker for this zone
            worker_result = await db.execute(
                select(Worker).where(Worker.zone == zone, Worker.status == "active")
            )
            worker = worker_result.scalar_one_or_none()
            
            if not worker:
                print(f"No active worker found for zone {zone}")
                return None
            
            # Create new task
            new_task = Task(
                task_id=f"task_{int(datetime.utcnow().timestamp())}_{bin_unit_id}",
                bin_unit_id=bin_unit_id,
                worker_id=worker.id,
                status="pending",
                assigned_at=datetime.utcnow(),
                priority="high",
                ignored_count=0,
                zone=zone
            )
            db.add(new_task)
            await db.commit()
            await db.refresh(new_task)
            print(f"✅ Auto-created task {new_task.task_id} for bin {bin_unit_id} (Zone: {zone})")
            return new_task
        except Exception as e:
            print(f"Error in auto_create_task: {e}")
            return None
    
    return None

@router.get("/", response_model=list[BinUnitResponse])
async def get_all_bins(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(BinUnit).order_by(BinUnit.id))
        bins = result.scalars().all()
        response = []
        for bin_unit in bins:
            meta_result = await db.execute(select(BinMetadata).where(BinMetadata.bin_unit_id == bin_unit.id))
            metadata = meta_result.scalar_one_or_none()
            
            assigned_worker_name = None
            assigned_worker_id = None
            if metadata and metadata.zone:
                worker_result = await db.execute(select(Worker).where(Worker.zone == metadata.zone))
                worker = worker_result.scalar_one_or_none()
                if worker:
                    assigned_worker_name = worker.name
                    assigned_worker_id = worker.worker_id
            
            response.append(BinUnitResponse(
                id=bin_unit.id,
                unit_id=bin_unit.unit_id,
                location=bin_unit.location,
                latitude=bin_unit.latitude,
                longitude=bin_unit.longitude,
                status=bin_unit.status,
                level=metadata.level if metadata else 0,
                last_cleaned=metadata.last_cleaned if metadata else None,
                threshold=metadata.threshold if metadata else 80,
                zone=metadata.zone if metadata else None,
                assigned_worker_name=assigned_worker_name,
                assigned_worker_id=assigned_worker_id,
            ))
        return response
    except Exception as e:
        print(f"Error in get_all_bins: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 🆕 NEW ENDPOINT: FIND BIN BY STRING UNIT_ID ---
@router.get("/unit-id/{unit_id}")
async def get_bin_by_unit_id(unit_id: str, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(BinUnit).where(BinUnit.unit_id == unit_id))
        bin_unit = result.scalar_one_or_none()
        if not bin_unit:
            raise HTTPException(status_code=404, detail="Bin not found")
        return bin_unit
    except Exception as e:
        print(f"Error fetching bin by unit_id: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bin-units/", response_model=BinUnitResponse)
async def create_bin_unit(bin_unit: BinUnitCreate, db: AsyncSession = Depends(get_db)):
    try:
        if bin_unit.zone and not validate_zone_format(bin_unit.zone):
            raise HTTPException(
                status_code=400, 
                detail="Invalid zone format. Use: District-Village-Ward (e.g., 28-4555-2)"
            )
        
        existing = await db.execute(select(BinUnit).where(BinUnit.unit_id == bin_unit.unit_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Unit ID already exists")
        
        db_bin = BinUnit(
            unit_id=bin_unit.unit_id,
            location=bin_unit.location,
            latitude=bin_unit.latitude,
            longitude=bin_unit.longitude,
            status=bin_unit.status
        )
        db.add(db_bin)
        await db.commit()
        await db.refresh(db_bin)
        
        metadata = BinMetadata(
            bin_unit_id=db_bin.id,
            level=0,
            threshold=80,
            last_cleaned=datetime.utcnow(),
            zone=bin_unit.zone if bin_unit.zone else None
        )
        db.add(metadata)
        await db.commit()
        
        assigned_worker_name = None
        assigned_worker_id = None
        if bin_unit.zone:
            worker_result = await db.execute(select(Worker).where(Worker.zone == bin_unit.zone))
            worker = worker_result.scalar_one_or_none()
            if worker:
                assigned_worker_name = worker.name
                assigned_worker_id = worker.worker_id
        
        return BinUnitResponse(
            id=db_bin.id,
            unit_id=db_bin.unit_id,
            location=db_bin.location,
            latitude=db_bin.latitude,
            longitude=db_bin.longitude,
            status=db_bin.status,
            level=metadata.level,
            last_cleaned=metadata.last_cleaned,
            threshold=metadata.threshold,
            zone=metadata.zone,
            assigned_worker_name=assigned_worker_name,
            assigned_worker_id=assigned_worker_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in create_bin_unit: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{bin_unit_id}", response_model=BinUnitResponse)
async def get_bin_by_id(bin_unit_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(BinUnit).where(BinUnit.id == bin_unit_id))
        bin_unit = result.scalar_one_or_none()
        if not bin_unit:
            raise HTTPException(status_code=404, detail="Bin not found")
        
        meta_result = await db.execute(select(BinMetadata).where(BinMetadata.bin_unit_id == bin_unit_id))
        metadata = meta_result.scalar_one_or_none()
        
        assigned_worker_name = None
        assigned_worker_id = None
        if metadata and metadata.zone:
            worker_result = await db.execute(select(Worker).where(Worker.zone == metadata.zone))
            worker = worker_result.scalar_one_or_none()
            if worker:
                assigned_worker_name = worker.name
                assigned_worker_id = worker.worker_id
        
        return BinUnitResponse(
            id=bin_unit.id,
            unit_id=bin_unit.unit_id,
            location=bin_unit.location,
            latitude=bin_unit.latitude,
            longitude=bin_unit.longitude,
            status=bin_unit.status,
            level=metadata.level if metadata else 0,
            last_cleaned=metadata.last_cleaned if metadata else None,
            threshold=metadata.threshold if metadata else 80,
            zone=metadata.zone if metadata else None,
            assigned_worker_name=assigned_worker_name,
            assigned_worker_id=assigned_worker_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_bin_by_id: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{bin_unit_id}/metadata")
async def update_bin_metadata(bin_unit_id: int, update: BinMetadataUpdate, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(BinUnit).where(BinUnit.id == bin_unit_id))
        bin_unit = result.scalar_one_or_none()
        if not bin_unit:
            raise HTTPException(404, "Bin not found")
        
        if update.zone and not validate_zone_format(update.zone):
            raise HTTPException(
                status_code=400, 
                detail="Invalid zone format. Use: District-Village-Ward (e.g., 28-4555-2)"
            )

        meta_result = await db.execute(select(BinMetadata).where(BinMetadata.bin_unit_id == bin_unit_id))
        metadata = meta_result.scalar_one_or_none()
        
        if not metadata:
            metadata = BinMetadata(bin_unit_id=bin_unit_id)
            db.add(metadata)

        old_level = metadata.level
        old_threshold = metadata.threshold
        
        for field, value in update.dict(exclude_unset=True).items():
            setattr(metadata, field, value)

        await db.commit()
        await db.refresh(metadata)
        
        # AUTO CREATE TASK if level exceeds threshold
        new_level = metadata.level
        new_threshold = metadata.threshold
        
        if new_level >= new_threshold and metadata.zone:
            if old_level < new_threshold or old_level < new_level:
                await auto_create_task(bin_unit_id, metadata.zone, new_level, new_threshold, db)
        
        return {"message": "Metadata updated"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in update_bin_metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{bin_unit_id}")
async def delete_bin(bin_unit_id: int, db: AsyncSession = Depends(get_db)):
    try:
        meta_result = await db.execute(select(BinMetadata).where(BinMetadata.bin_unit_id == bin_unit_id))
        metadata = meta_result.scalar_one_or_none()
        if metadata:
            await db.delete(metadata)
        
        result = await db.execute(select(BinUnit).where(BinUnit.id == bin_unit_id))
        bin_unit = result.scalar_one_or_none()
        if not bin_unit:
            raise HTTPException(404, "Bin not found")
        
        await db.delete(bin_unit)
        await db.commit()
        return {"message": "Bin deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in delete_bin: {e}")
        raise HTTPException(status_code=500, detail=str(e))