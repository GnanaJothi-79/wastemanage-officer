import { narrowGraph } from './graphData';

type GraphNodes = typeof narrowGraph.nodes;
type GraphEdges = typeof narrowGraph.edges;

// Helper: get all node IDs
const getAllNodeIds = (): string[] => Object.keys(narrowGraph.nodes);

// Find shortest path using Dijkstra's algorithm
export const findShortestPath = (startId: string, endId: string): string[] => {
  const nodes = getAllNodeIds();
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>(nodes);

  // Initialize distances
  for (const node of nodes) {
    distances[node] = Infinity;
    previous[node] = null;
  }
  distances[startId] = 0;

  // Cast edges to an indexable type for safe access
  const edges = narrowGraph.edges as Record<string, { distance: number; type: string }>;

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let current: string | null = null;
    for (const node of unvisited) {
      if (current === null || distances[node] < distances[current]) {
        current = node;
      }
    }
    if (current === null || distances[current] === Infinity) break;
    if (current === endId) break;

    unvisited.delete(current);

    // Find neighbours
    const neighbours: string[] = [];
    for (const edge of Object.keys(edges)) {
      const parts = edge.split('->');
      if (parts[0] === current && unvisited.has(parts[1])) {
        neighbours.push(parts[1]);
      } else if (parts[1] === current && unvisited.has(parts[0])) {
        neighbours.push(parts[0]);
      }
    }

    for (const neighbour of neighbours) {
      // Determine edge key (always "from->to")
      let edgeKey: string;
      if (edges[`${current}->${neighbour}`]) {
        edgeKey = `${current}->${neighbour}`;
      } else {
        edgeKey = `${neighbour}->${current}`;
      }
      const alt = distances[current] + edges[edgeKey].distance;
      if (alt < distances[neighbour]) {
        distances[neighbour] = alt;
        previous[neighbour] = current;
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let curr: string | null = endId;
  while (curr !== null) {
    path.unshift(curr);
    curr = previous[curr];
  }
  if (path[0] !== startId) return []; // no valid route
  return path;
};

// Get route coordinates from worker location to bin location
export const getRoute = (
  workerLat: number,
  workerLng: number,
  binLat: number,
  binLng: number
): { pathIds: string[]; routeCoords: { lat: number; lng: number }[] } => {
  const nodes = narrowGraph.nodes;
  let startNodeId = 'worker_home';
  let endNodeId = 'bin_b1';

  // Find closest graph node to worker location
  let minStartDist = Infinity;
  for (const [id, coords] of Object.entries(nodes)) {
    const nodeCoords = coords as { lat: number; lng: number };
    const dist = Math.hypot(nodeCoords.lat - workerLat, nodeCoords.lng - workerLng);
    if (dist < minStartDist) {
      minStartDist = dist;
      startNodeId = id;
    }
  }

  // Find closest graph node to bin location
  let minEndDist = Infinity;
  for (const [id, coords] of Object.entries(nodes)) {
    const nodeCoords = coords as { lat: number; lng: number };
    const dist = Math.hypot(nodeCoords.lat - binLat, nodeCoords.lng - binLng);
    if (dist < minEndDist) {
      minEndDist = dist;
      endNodeId = id;
    }
  }

  const pathIds = findShortestPath(startNodeId, endNodeId);
  const routeCoords = pathIds.map(id => nodes[id as keyof typeof nodes] as { lat: number; lng: number });

  return { pathIds, routeCoords };
};