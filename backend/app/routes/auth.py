from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Officer
from app.schemas import OfficerCreate, OfficerLogin, OfficerResponse

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/check-exists")
async def check_officer_exists(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Officer))
        officers = result.scalars().all()
        return {"exists": len(officers) > 0}
    except Exception as e:
        print(f"Error checking officer existence: {e}")
        return {"exists": False}

@router.post("/register", response_model=OfficerResponse)
async def register_officer(officer: OfficerCreate, db: AsyncSession = Depends(get_db)):
    try:
        # Check if email exists
        result = await db.execute(select(Officer).where(Officer.email == officer.email))
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Check if officer_id exists
        result = await db.execute(select(Officer).where(Officer.officer_id == officer.officer_id))
        existing_id = result.scalar_one_or_none()
        if existing_id:
            raise HTTPException(status_code=400, detail="Officer ID already exists")
        
        # Create new officer
        db_officer = Officer(
            officer_id=officer.officer_id,
            name=officer.name,
            email=officer.email,
            password=officer.password  # Plain text for demo
        )
        db.add(db_officer)
        await db.commit()
        await db.refresh(db_officer)
        
        return OfficerResponse(
            officer_id=db_officer.officer_id,
            name=db_officer.name,
            email=db_officer.email
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in register: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def login_officer(login: OfficerLogin, db: AsyncSession = Depends(get_db)):
    try:
        # Find officer by email
        result = await db.execute(select(Officer).where(Officer.email == login.email))
        officer = result.scalar_one_or_none()
        
        # Check if officer exists AND password matches
        if not officer:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        if officer.password != login.password:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Login successful
        return {
            "message": "Login successful", 
            "officer_id": officer.officer_id,
            "name": officer.name,
            "email": officer.email
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in login: {e}")
        raise HTTPException(status_code=500, detail=str(e))