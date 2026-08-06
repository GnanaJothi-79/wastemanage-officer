from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.sql import func
from app.database import get_db
from app.models import Worker
from app.schemas import (
    WorkerCreate, WorkerUpdate, WorkerResponse, WorkerLogin, WorkerLocationUpdate
)
import re

router = APIRouter(prefix="/workers", tags=["workers"])

def validate_zone_format(zone: str) -> bool:
    pattern = r'^([1-9]|[1-2][0-9]|3[0-5])-([1-9]|[1-9][0-9]{1,3}|[1-4][0-9]{3}|5000)-([1-9]|1[0-9]|2[0-5])$'
    return re.match(pattern, zone) is not None

# ==========================================================
# 1. WORKER REAL-TIME LOCATION UPDATE (GPS)
# ==========================================================
@router.put("/location")
async def update_worker_location(
    location_data: WorkerLocationUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint for the worker's mobile app to send their real-time GPS coordinates.
    Updates current_latitude and current_longitude in the database.
    """
    try:
        # Find the worker by worker_id
        result = await db.execute(select(Worker).where(Worker.worker_id == location_data.worker_id))
        worker = result.scalar_one_or_none()
        
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found")
        
        # Update the real-time coordinates
        stmt = (
            update(Worker)
            .where(Worker.worker_id == location_data.worker_id)
            .values(
                current_latitude=location_data.latitude,
                current_longitude=location_data.longitude,
                last_location_update=func.now()
            )
            .returning(Worker)
        )
        result = await db.execute(stmt)
        await db.commit()
        
        updated_worker = result.scalar_one_or_none()
        
        return {
            "status": "success",
            "message": f"Location updated for worker {updated_worker.name}",
            "worker_id": updated_worker.worker_id,
            "current_latitude": updated_worker.current_latitude,
            "current_longitude": updated_worker.current_longitude
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating worker location: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ==========================================================
# 2. WORKER LOGIN
# ==========================================================
@router.post("/login")
async def worker_login(login: WorkerLogin, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Worker).where(Worker.email == login.email))
        worker = result.scalar_one_or_none()
        
        if not worker:
            raise HTTPException(status_code=401, detail="Worker not found")
        
        if worker.password != login.password:
            raise HTTPException(status_code=401, detail="Invalid password")
        
        if worker.status != "active":
            raise HTTPException(status_code=401, detail="Worker account is not active. Please contact your officer.")
        
        return {
            "id": worker.id,
            "worker_id": worker.worker_id,
            "name": worker.name,
            "email": worker.email,
            "zone": worker.zone,
            "status": worker.status,
            "lat": worker.lat,
            "lng": worker.lng,
            "current_latitude": worker.current_latitude,
            "current_longitude": worker.current_longitude
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in worker login: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================================
# 3. CREATE WORKER
# ==========================================================
@router.post("/", response_model=WorkerResponse)
async def create_worker(worker: WorkerCreate, db: AsyncSession = Depends(get_db)):
    if not validate_zone_format(worker.zone):
        raise HTTPException(status_code=400, detail="Invalid zone format")
    
    result = await db.execute(select(Worker).where(Worker.worker_id == worker.worker_id))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Worker ID already exists")
    
    zone_result = await db.execute(select(Worker).where(Worker.zone == worker.zone))
    if zone_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Zone {worker.zone} is already assigned")
    
    db_worker = Worker(**worker.dict())
    db.add(db_worker)
    await db.commit()
    await db.refresh(db_worker)
    return db_worker

# ==========================================================
# 4. GET ALL WORKERS
# ==========================================================
@router.get("/", response_model=list[WorkerResponse])
async def get_workers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Worker))
    workers = result.scalars().all()
    return workers

# ==========================================================
# 5. GET SINGLE WORKER
# ==========================================================
@router.get("/{identifier}", response_model=WorkerResponse)
async def get_worker(identifier: str, db: AsyncSession = Depends(get_db)):
    # Try by integer ID first
    if identifier.isdigit():
        result = await db.execute(select(Worker).where(Worker.id == int(identifier)))
        worker = result.scalar_one_or_none()
        if worker:
            return worker
    
    # Then try by worker_id string
    result = await db.execute(select(Worker).where(Worker.worker_id == identifier))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return worker

# ==========================================================
# 6. UPDATE WORKER
# ==========================================================
@router.put("/{identifier}", response_model=WorkerResponse)
async def update_worker(identifier: str, update: WorkerUpdate, db: AsyncSession = Depends(get_db)):
    print(f"🔍 Updating worker with identifier: '{identifier}'")
    
    # Try by integer ID first
    worker = None
    if identifier.isdigit():
        result = await db.execute(select(Worker).where(Worker.id == int(identifier)))
        worker = result.scalar_one_or_none()
    
    # If not found by ID, try by worker_id string
    if not worker:
        result = await db.execute(select(Worker).where(Worker.worker_id == identifier))
        worker = result.scalar_one_or_none()
    
    if not worker:
        print(f"❌ Worker '{identifier}' not found")
        raise HTTPException(status_code=404, detail=f"Worker not found with identifier: {identifier}")
    
    print(f"✅ Found worker: ID={worker.id}, worker_id={worker.worker_id}, name={worker.name}")
    
    if update.zone and not validate_zone_format(update.zone):
        raise HTTPException(status_code=400, detail="Invalid zone format")
    
    if update.zone and update.zone != worker.zone:
        zone_result = await db.execute(select(Worker).where(Worker.zone == update.zone))
        if zone_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Zone {update.zone} is already assigned")
    
    for field, value in update.dict(exclude_unset=True).items():
        if value is not None:
            setattr(worker, field, value)
    
    await db.commit()
    await db.refresh(worker)
    print(f"✅ Worker {worker.worker_id} updated successfully")
    return worker

# ==========================================================
# 7. DELETE WORKER
# ==========================================================
@router.delete("/{identifier}")
async def delete_worker(identifier: str, db: AsyncSession = Depends(get_db)):
    # Try by integer ID first
    if identifier.isdigit():
        result = await db.execute(select(Worker).where(Worker.id == int(identifier)))
        worker = result.scalar_one_or_none()
        if worker:
            await db.delete(worker)
            await db.commit()
            return {"message": "Worker deleted successfully"}
    
    # Then try by worker_id string
    result = await db.execute(select(Worker).where(Worker.worker_id == identifier))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    await db.delete(worker)
    await db.commit()
    return {"message": "Worker deleted successfully"}