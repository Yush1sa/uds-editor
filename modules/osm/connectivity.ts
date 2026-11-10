import type { coreGraph } from '../core/graph';
import type { EntityId, WayId } from './id_manager';

// highway values which MATSim / SUMO treat as part of the drivable road network
const DRIVABLE = new Set([
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential',
  'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link',
  'service', 'living_street'
]);


/**
 * Splits the drivable road network into connected groups of ways (two ways are connected
 * when they share a node). Direction of one-way streets is not taken into account.
 *
 * @returns groups of way ids, the biggest group first. More than one group
 *          means that the graph has isolated pieces, which cannot be reached by traffic.
 */
export function osmConnectivity(graph: coreGraph): WayId[][] {
  const ways = [];
  for (const id in graph.entities) {
    const way = graph.hasEntity(<EntityId>id);
    if (way && way.type === 'way' && DRIVABLE.has(way.tags.highway)) ways.push(way);
  }

  // union-find over way indexes
  const parent = ways.map((_, i) => i);
  const find = (i: number): number => parent[i] === i ? i : (parent[i] = find(parent[i]));

  const firstWayAtNode = new Map<string, number>();
  ways.forEach((way, i) => {
    for (const nodeID of way.nodes) {
      const other = firstWayAtNode.get(nodeID);
      if (other === undefined) firstWayAtNode.set(nodeID, i);
      else parent[find(i)] = find(other);
    }
  });

  const groups = new Map<number, WayId[]>();
  ways.forEach((way, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(way.id);
  });

  return Array.from(groups.values()).sort((a, b) => b.length - a.length);
}
