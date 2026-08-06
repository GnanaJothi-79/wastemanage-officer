from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# ========== Officer Schemas ==========
class OfficerCreate(BaseModel):
    officer_id: str
    name: str
    email: str
    password: str

class OfficerLogin(BaseModel):
    email: str
    password: str

class OfficerResponse(BaseModel):
    officer_id: str
    name: str
    email: str

# ========== Worker Schemas ==========
class WorkerLogin(BaseModel):
    email: str
    password: str

class WorkerCreate(BaseModel):
    worker_id: str
    name: str
    email: str
    password: str
    zone: str
    status: str = "active"
    lat: Optional[float] = None
    lng: Optional[float] = None

class WorkerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    zone: Optional[str] = None
    status: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class WorkerResponse(BaseModel):
    id: int
    worker_id: str
    name: str
    email: str
    zone: str
    status: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None

    class Config:
        from_attributes = True

# ========== Worker Location Update Schema ==========
class WorkerLocationUpdate(BaseModel):
    worker_id: str
    latitude: float
    longitude: float

# ========== Bin Schemas ==========
class BinUnitCreate(BaseModel):
    unit_id: str
    location: str
    latitude: float
    longitude: float
    status: str = "active"
    zone: Optional[str] = None

class BinUnitResponse(BaseModel):
    id: int
    unit_id: str
    location: str
    latitude: float
    longitude: float
    status: str
    level: int
    last_cleaned: Optional[datetime] = None
    threshold: int
    zone: Optional[str] = None
    assigned_worker_name: Optional[str] = None
    assigned_worker_id: Optional[str] = None

class BinMetadataUpdate(BaseModel):
    level: Optional[int] = None
    zone: Optional[str] = None
    threshold: Optional[int] = None
    last_cleaned: Optional[datetime] = None

# ========== Task Schemas ==========
class TaskCreate(BaseModel):
    task_id: str
    bin_unit_id: int
    worker_id: int
    status: str = "pending"
    priority: str = "medium"
    zone: Optional[str] = None

class TaskUpdate(BaseModel):
    status: Optional[str] = None
    ignored_count: Optional[int] = None
    worker_id: Optional[int] = None

class TaskResponse(BaseModel):
    id: int
    task_id: str
    bin_unit_id: int
    worker_id: int
    status: str
    assigned_at: datetime
    priority: str
    ignored_count: int
    zone: Optional[str] = None

# ========== Task Complete Schema ==========
class TaskComplete(BaseModel):
    status: str
    completed_at: datetime