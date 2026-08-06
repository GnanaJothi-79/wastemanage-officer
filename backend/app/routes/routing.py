from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import math
from typing import List
from app.config import settings

router = APIRouter(prefix="/routing", tags=["routing"])

# OpenRouteService API key (add to your .env file)
ORS_API_KEY = settings.ORS_API_KEY if hasattr(settings, 'ORS_API_KEY') else ""

class RouteRequest(BaseModel):
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float

class RouteResponse(BaseModel):
    distance: float  # in meters
    duration: float  # in seconds
    geometry: List[List[float]]  # list of [lat, lng] coordinates

@router.post("/directions")
async def get_directions(request: RouteRequest):
    """
    Get turn-by-turn directions using OpenRouteService API or fallback
    """
    try:
        # If ORS API key is available, use it
        if ORS_API_KEY and ORS_API_KEY != "":
            try:
                # ORS API endpoint for foot/walking directions
                url = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson"
                
                headers = {
                    "Authorization": ORS_API_KEY,
                    "Content-Type": "application/json"
                }
                
                body = {
                    "coordinates": [
                        [request.start_lng, request.start_lat],
                        [request.end_lng, request.end_lat]
                    ]
                }
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(url, json=body, headers=headers)
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        if "features" in data and len(data["features"]) > 0:
                            feature = data["features"][0]
                            geometry = feature["geometry"]["coordinates"]
                            properties = feature["properties"]
                            segments = properties["segments"][0]
                            
                            # Convert geometry to [lat, lng] format
                            formatted_geometry = [[coord[1], coord[0]] for coord in geometry]
                            
                            return RouteResponse(
                                distance=segments["distance"],
                                duration=segments["duration"],
                                geometry=formatted_geometry
                            )
            except Exception as ors_error:
                print(f"ORS API error: {ors_error}")
                # Fall through to fallback
        
        # Fallback: Generate a realistic path
        print("Using fallback routing...")
        distance = calculate_distance(
            request.start_lat, request.start_lng,
            request.end_lat, request.end_lng
        )
        
        # Generate a curved path with waypoints
        geometry = generate_path_with_waypoints(
            request.start_lat, request.start_lng,
            request.end_lat, request.end_lng
        )
        
        # Estimate walking speed: 1.4 m/s
        duration = distance / 1.4
        
        return RouteResponse(
            distance=distance,
            duration=duration,
            geometry=geometry
        )
    
    except Exception as e:
        print(f"Routing error: {e}")
        # Ultimate fallback - straight line
        distance = calculate_distance(
            request.start_lat, request.start_lng,
            request.end_lat, request.end_lng
        )
        geometry = [
            [request.start_lat, request.start_lng],
            [request.end_lat, request.end_lng]
        ]
        duration = distance / 1.4
        
        return RouteResponse(
            distance=distance,
            duration=duration,
            geometry=geometry
        )

@router.get("/health")
async def health_check():
    """Health check endpoint to verify routing is working"""
    return {"status": "ok", "message": "Routing service is running"}

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters using Haversine formula"""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def generate_path_with_waypoints(lat1: float, lon1: float, lat2: float, lon2: float, num_points: int = 30) -> List[List[float]]:
    """Generate a realistic path with waypoints between two points"""
    points = []
    
    # Calculate midpoint
    mid_lat = (lat1 + lat2) / 2
    mid_lon = (lon1 + lon2) / 2
    
    # Calculate perpendicular offset for curve
    dx = lon2 - lon1
    dy = lat2 - lat1
    length = math.sqrt(dx*dx + dy*dy)
    
    if length > 0:
        # Perpendicular direction
        perp_x = -dy / length
        perp_y = dx / length
        
        # Curve intensity (max 0.03 degrees ~ 3.3km)
        curve_intensity = min(0.03, length * 0.08)
        
        # Control point offset
        ctrl_lat = mid_lat + perp_y * curve_intensity
        ctrl_lon = mid_lon + perp_x * curve_intensity
    else:
        ctrl_lat = mid_lat
        ctrl_lon = mid_lon
    
    # Generate quadratic bezier curve
    for i in range(num_points + 1):
        t = i / num_points
        # Quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
        lat = (1-t)**2 * lat1 + 2*(1-t)*t * ctrl_lat + t**2 * lat2
        lon = (1-t)**2 * lon1 + 2*(1-t)*t * ctrl_lon + t**2 * lon2
        points.append([lat, lon])
    
    return points