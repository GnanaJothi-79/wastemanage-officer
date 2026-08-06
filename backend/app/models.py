from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Officer(Base):
    __tablename__ = "officers"
    id = Column(Integer, primary_key=True, index=True)
    officer_id = Column(String, unique=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)

class Worker(Base):
    __tablename__ = "workers"
    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(String, unique=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    zone = Column(String, unique=True)
    status = Column(String, default="active")
    
    # Original / Assigned Static Location
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    
    # GPS Tracking Fields
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    last_location_update = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, unique=True, index=True)
    bin_unit_id = Column(Integer, index=True)
    worker_id = Column(Integer, index=True)
    status = Column(String)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    priority = Column(String)
    ignored_count = Column(Integer, default=0)
    zone = Column(String, nullable=True)

class BinUnit(Base):
    __tablename__ = "bin_units"
    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(String, unique=True, index=True)
    location = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(String)
    bin_metadata = relationship("BinMetadata", back_populates="bin_unit", uselist=False)

class BinMetadata(Base):
    __tablename__ = "bin_metadata"
    id = Column(Integer, primary_key=True, index=True)
    bin_unit_id = Column(Integer, ForeignKey("bin_units.id"), unique=True)
    level = Column(Integer, default=0)
    last_cleaned = Column(DateTime, default=datetime.utcnow)
    threshold = Column(Integer, default=80)
    zone = Column(String)
    bin_unit = relationship("BinUnit", back_populates="bin_metadata")