// Graph nodes and edges for narrow street routing (Dijkstra algorithm)
export const narrowGraph = {
  nodes: {
    worker_home: { lat: 12.9716, lng: 77.5946 },
    junction1: { lat: 12.9718, lng: 77.5948 },
    bin_b1: { lat: 12.9718, lng: 77.5948 },
    junction2: { lat: 12.9720, lng: 77.5950 },
    bin_b2: { lat: 12.9722, lng: 77.5952 },
    narrow_start: { lat: 12.9719, lng: 77.5949 },
    narrow_end: { lat: 12.9721, lng: 77.5951 },
  },
  edges: {
    'worker_home->junction1': { distance: 0.05, type: 'main' },
    'junction1->bin_b1': { distance: 0.02, type: 'narrow' },
    'junction1->junction2': { distance: 0.08, type: 'main' },
    'junction2->bin_b2': { distance: 0.03, type: 'main' },
    'junction2->narrow_start': { distance: 0.01, type: 'alley' },
    'narrow_start->narrow_end': { distance: 0.02, type: 'narrow' },
    'narrow_end->bin_b1': { distance: 0.01, type: 'narrow' },
  },
} as const;