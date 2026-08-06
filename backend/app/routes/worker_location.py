# backend/app/routers/worker_location.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

# Get database connection string from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

router = APIRouter()

# --- Pydantic Model for the request body ---
class WorkerLocationUpdate(BaseModel):
    worker_id: str
    latitude: float
    longitude: float

# --- Database Connection Helper ---
def get_db():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        yield conn
    finally:
        conn.close()

@router.put("/workers/update-location")
async def update_worker_location(
    location_data: WorkerLocationUpdate,
    db = Depends(get_db)
):
    """
    Endpoint for the worker's mobile app to send their real-time GPS coordinates.
    """
    try:
        cursor = db.cursor()
        
        # SQL to update the worker's current location and timestamp
        update_query = """
            UPDATE workers 
            SET current_latitude = %s, 
                current_longitude = %s, 
                last_location_update = NOW() 
            WHERE worker_id = %s
            RETURNING id, worker_id, name;
        """
        
        cursor.execute(update_query, (
            location_data.latitude, 
            location_data.longitude, 
            location_data.worker_id
        ))
        
        updated_worker = cursor.fetchone()
        db.commit()
        
        if not updated_worker:
            raise HTTPException(status_code=404, detail="Worker ID not found")
            
        return {
            "status": "success",
            "message": f"Location updated for worker {updated_worker['name']}",
            "data": updated_worker
        }
        
    except Exception as e:
        db.rollback()
        print(f"Error updating worker location: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")