from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Worker
from math import radians, sin, cos, sqrt, atan2

# Narrow street graph (same as before)
NARROW_GRAPH = {
    "nodes": {
        "worker_home": {"lat": 12.9716, "lng": 77.5946},
        "junction1": {"lat": 12.9718, "lng": 77.5948},
        "bin_b1": {"lat": 12.9718, "lng": 77.5948},
        "junction2": {"lat": 12.9720, "lng": 77.5950},
        "bin_b2": {"lat": 12.9722, "lng": 77.5952},
        "narrow_start": {"lat": 12.9719, "lng": 77.5949},
        "narrow_end": {"lat": 12.9721, "lng": 77.5951},
    },
    "edges": {
        "worker_home->junction1": {"distance": 0.05, "type": "main"},
        "junction1->bin_b1": {"distance": 0.02, "type": "narrow"},
        "junction1->junction2": {"distance": 0.08, "type": "main"},
        "junction2->bin_b2": {"distance": 0.03, "type": "main"},
        "junction2->narrow_start": {"distance": 0.01, "type": "alley"},
        "narrow_start->narrow_end": {"distance": 0.02, "type": "narrow"},
        "narrow_end->bin_b1": {"distance": 0.01, "type": "narrow"},
    }
}

def dijkstra(start_id: str, end_id: str):
    nodes = list(NARROW_GRAPH["nodes"].keys())
    distances = {node: float('inf') for node in nodes}
    previous = {node: None for node in nodes}
    distances[start_id] = 0
    unvisited = set(nodes)

    while unvisited:
        current = min(unvisited, key=lambda node: distances[node])
        if distances[current] == float('inf'):
            break
        unvisited.remove(current)
        if current == end_id:
            break
        neighbors = []
        edges = NARROW_GRAPH["edges"]
        for edge in edges:
            parts = edge.split("->")
            if parts[0] == current and parts[1] in unvisited:
                neighbors.append(parts[1])
            elif parts[1] == current and parts[0] in unvisited:
                neighbors.append(parts[0])
        for neighbor in neighbors:
            # find edge distance
            edge_key = f"{current}->{neighbor}" if f"{current}->{neighbor}" in edges else f"{neighbor}->{current}"
            alt = distances[current] + edges[edge_key]["distance"]
            if alt < distances[neighbor]:
                distances[neighbor] = alt
                previous[neighbor] = current

    path = []
    node = end_id
    while node is not None:
        path.insert(0, node)
        node = previous[node]
    if path[0] != start_id:
        return []
    return path

def get_route(worker_lat: float, worker_lng: float, bin_lat: float, bin_lng: float):
    nodes = NARROW_GRAPH["nodes"]
    # Find closest start node
    start_id = min(nodes.keys(), key=lambda nid: (nodes[nid]["lat"] - worker_lat)**2 + (nodes[nid]["lng"] - worker_lng)**2)
    end_id = min(nodes.keys(), key=lambda nid: (nodes[nid]["lat"] - bin_lat)**2 + (nodes[nid]["lng"] - bin_lng)**2)
    path_ids = dijkstra(start_id, end_id)
    route_coords = [nodes[nid] for nid in path_ids]
    return {"path_ids": path_ids, "route_coords": route_coords}

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Worker
from math import radians, sin, cos, sqrt, atan2

async def find_nearest_worker(bin_lat: float, bin_lng: float, db: AsyncSession):
    result = await db.execute(select(Worker).where(Worker.status == "active"))
    workers = result.scalars().all()
    if not workers:
        return None
    
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        return R * c
    
    nearest = min(workers, key=lambda w: haversine(bin_lat, bin_lng, w.lat, w.lng))
    return nearest