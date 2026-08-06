from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.database import get_db
from app.models import Task, Worker, BinUnit, BinMetadata
from app.schemas import TaskCreate, TaskUpdate, TaskResponse, TaskComplete
import math

router = APIRouter(prefix="/tasks", tags=["tasks"])

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in kilometers using Haversine formula"""
    R = 6371  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

@router.post("/", response_model=TaskResponse)
async def create_task(task: TaskCreate, db: AsyncSession = Depends(get_db)):
    try:
        db_task = Task(
            task_id=task.task_id,
            bin_unit_id=task.bin_unit_id,
            worker_id=task.worker_id,
            status=task.status,
            assigned_at=datetime.utcnow(),
            priority=task.priority,
            ignored_count=0,
            zone=task.zone
        )
        db.add(db_task)
        await db.commit()
        await db.refresh(db_task)
        
        return TaskResponse(
            id=db_task.id,
            task_id=db_task.task_id,
            bin_unit_id=db_task.bin_unit_id,
            worker_id=db_task.worker_id,
            status=db_task.status,
            assigned_at=db_task.assigned_at,
            completed_at=db_task.completed_at,
            priority=db_task.priority,
            ignored_count=db_task.ignored_count,
            zone=db_task.zone
        )
    except Exception as e:
        print(f"Error in create_task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=list[TaskResponse])
async def get_tasks(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Task))
        tasks = result.scalars().all()
        return [
            TaskResponse(
                id=t.id,
                task_id=t.task_id,
                bin_unit_id=t.bin_unit_id,
                worker_id=t.worker_id,
                status=t.status,
                assigned_at=t.assigned_at,
                completed_at=t.completed_at,
                priority=t.priority,
                ignored_count=t.ignored_count,
                zone=t.zone
            ) for t in tasks
        ]
    except Exception as e:
        print(f"Error in get_tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/worker/{worker_id}", response_model=list[TaskResponse])
async def get_tasks_for_worker(worker_id: str, db: AsyncSession = Depends(get_db)):
    try:
        # Convert string ID to integer
        try:
            worker_int = int(worker_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid worker ID format")

        result = await db.execute(select(Task).where(Task.worker_id == worker_int))
        tasks = result.scalars().all()
        
        return [
            TaskResponse(
                id=t.id,
                task_id=t.task_id,
                bin_unit_id=t.bin_unit_id,
                worker_id=t.worker_id,
                status=t.status,
                assigned_at=t.assigned_at,
                completed_at=t.completed_at,
                priority=t.priority,
                ignored_count=t.ignored_count,
                zone=t.zone
            ) for t in tasks
        ]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_tasks_for_worker: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/worker/{worker_id}/completed", response_model=list[TaskResponse])
async def get_completed_tasks(worker_id: str, db: AsyncSession = Depends(get_db)):
    try:
        try:
            worker_int = int(worker_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid worker ID format")

        result = await db.execute(
            select(Task).where(Task.worker_id == worker_int, Task.status == "completed")
        )
        tasks = result.scalars().all()
        return [
            TaskResponse(
                id=t.id,
                task_id=t.task_id,
                bin_unit_id=t.bin_unit_id,
                worker_id=t.worker_id,
                status=t.status,
                assigned_at=t.assigned_at,
                completed_at=t.completed_at,
                priority=t.priority,
                ignored_count=t.ignored_count,
                zone=t.zone
            ) for t in tasks
        ]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_completed_tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Task).where(Task.task_id == task_id))
        task = result.scalar_one_or_none()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return TaskResponse(
            id=task.id,
            task_id=task.task_id,
            bin_unit_id=task.bin_unit_id,
            worker_id=task.worker_id,
            status=task.status,
            assigned_at=task.assigned_at,
            completed_at=task.completed_at,
            priority=task.priority,
            ignored_count=task.ignored_count,
            zone=task.zone
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, update: TaskUpdate, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Task).where(Task.task_id == task_id))
        task = result.scalar_one_or_none()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        for field, value in update.dict(exclude_unset=True).items():
            if value is not None:
                setattr(task, field, value)
        
        await db.commit()
        await db.refresh(task)
        
        return TaskResponse(
            id=task.id,
            task_id=task.task_id,
            bin_unit_id=task.bin_unit_id,
            worker_id=task.worker_id,
            status=task.status,
            assigned_at=task.assigned_at,
            completed_at=task.completed_at,
            priority=task.priority,
            ignored_count=task.ignored_count,
            zone=task.zone
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in update_task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(task_id: str, complete: TaskComplete, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Task).where(Task.task_id == task_id))
        task = result.scalar_one_or_none()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task.status = complete.status
        task.completed_at = complete.completed_at
        
        await db.commit()
        await db.refresh(task)
        
        return TaskResponse(
            id=task.id,
            task_id=task.task_id,
            bin_unit_id=task.bin_unit_id,
            worker_id=task.worker_id,
            status=task.status,
            assigned_at=task.assigned_at,
            completed_at=task.completed_at,
            priority=task.priority,
            ignored_count=task.ignored_count,
            zone=task.zone
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in complete_task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auto-assign/{bin_unit_id}")
async def auto_assign_task(bin_unit_id: int, db: AsyncSession = Depends(get_db)):
    try:
        print(f"=== AUTO ASSIGN TASK CALLED ===")
        print(f"Bin Unit ID: {bin_unit_id}")
        
        # Get bin with metadata
        bin_result = await db.execute(select(BinUnit).where(BinUnit.id == bin_unit_id))
        bin_unit = bin_result.scalar_one_or_none()
        if not bin_unit:
            raise HTTPException(status_code=404, detail="Bin not found")
        
        print(f"Bin found: {bin_unit.unit_id} - {bin_unit.location}")
        
        # Get bin metadata
        meta_result = await db.execute(select(BinMetadata).where(BinMetadata.bin_unit_id == bin_unit_id))
        metadata = meta_result.scalar_one_or_none()
        
        if not metadata or not metadata.zone:
            raise HTTPException(status_code=400, detail="Bin has no zone assigned")
        
        print(f"Bin zone: {metadata.zone}")
        
        # Find worker for this exact zone
        worker_result = await db.execute(
            select(Worker).where(Worker.zone == metadata.zone, Worker.status == "active")
        )
        worker = worker_result.scalar_one_or_none()
        
        if not worker:
            raise HTTPException(
                status_code=404, 
                detail=f"No active worker found for Zone: {metadata.zone}"
            )
        
        print(f"Found worker: {worker.name} (ID: {worker.id})")
        
        # Check if there's already a pending task for this bin
        existing_task_result = await db.execute(
            select(Task).where(Task.bin_unit_id == bin_unit_id, Task.status.in_(['pending', 'in-progress']))
        )
        existing_task = existing_task_result.scalar_one_or_none()
        
        if existing_task:
            print(f"Task already exists: {existing_task.task_id}")
            return {
                "message": f"Task already exists for bin {bin_unit.unit_id}",
                "task_id": existing_task.task_id,
                "worker": worker.name,
                "zone": metadata.zone,
                "already_exists": True
            }
        
        # Create new task
        new_task = Task(
            task_id=f"task_{int(datetime.utcnow().timestamp())}_{bin_unit_id}",
            bin_unit_id=bin_unit_id,
            worker_id=worker.id,
            status="pending",
            assigned_at=datetime.utcnow(),
            priority="high",
            ignored_count=0,
            zone=metadata.zone
        )
        db.add(new_task)
        await db.commit()
        await db.refresh(new_task)
        
        print(f"✅ Task created successfully: {new_task.task_id}")
        
        return {
            "message": f"Task assigned to worker {worker.name}",
            "task_id": new_task.task_id,
            "worker": worker.name,
            "zone": metadata.zone,
            "already_exists": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in auto_assign_task: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))