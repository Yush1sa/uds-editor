import type { coreGraph } from '../core/graph';
import type { OsmEntity } from './abstract-entity';
import type { EntityId, NodeId, OsmType } from './id_manager';
import { osmIdManager } from './id_manager';
import { osmNode } from './node';
import { osmRelation } from './relation';
import { osmWay } from './way';


/**
 * Reads the text of an `.osm` file (OSM XML 0.6) and returns iD entities.
 * Used by the "Open .osm" tool instead of loading data tiles from the OSM API.
 *
 * Entities are returned in the shape which `history.merge()` expects,
 * so they become the "base" graph of the editing session.
 */
export function osmXmlParse(text: string): OsmEntity[] {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const root = doc.documentElement;

  if (doc.querySelector('parsererror') || root.nodeName !== 'osm') {
    throw new Error('Not a valid OSM XML file');
  }

  const entities: OsmEntity[] = [];

  for (const el of Array.from(root.children)) {
    const type = el.nodeName;
    if (type !== 'node' && type !== 'way' && type !== 'relation') continue;
    if (el.getAttribute('action') === 'delete') continue;   // JOSM marks removed objects like this

    const id = osmIdManager.fromOSM(type, Number(el.getAttribute('id')));
    const attrs = {
      id,
      visible: el.getAttribute('visible') !== 'false',
      version: Number(el.getAttribute('version')) || undefined,
      tags: readTags(el)
    };

    if (type === 'node') {
      const lon = Number(el.getAttribute('lon'));
      const lat = Number(el.getAttribute('lat'));
      if (!isFinite(lon) || !isFinite(lat)) continue;   // nodes without coordinates are useless to us
      entities.push(new osmNode({ ...attrs, loc: [lon, lat] }));

    } else if (type === 'way') {
      const nodes = Array.from(el.getElementsByTagName('nd'))
        .map(nd => <NodeId>osmIdManager.fromOSM('node', Number(nd.getAttribute('ref'))));
      entities.push(new osmWay({ ...attrs, nodes }));

    } else {
      const members = Array.from(el.getElementsByTagName('member')).map(m => ({
        id: <EntityId>(m.getAttribute('type')![0] + m.getAttribute('ref')),
        type: <OsmType>m.getAttribute('type')!,
        role: m.getAttribute('role') || ''
      }));
      entities.push(new osmRelation({ ...attrs, members }));
    }
  }
  return entities;
}


function readTags(el: Element): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const tag of Array.from(el.children)) {
    if (tag.nodeName === 'tag') tags[tag.getAttribute('k')!] = tag.getAttribute('v') || '';
  }
  return tags;
}


/**
 * Serialises the whole current graph (loaded data + user edits) to OSM XML 0.6.
 *
 * Objects created in the editor have negative ids. SUMO / MATSim / Webots importers
 * are happier with positive ones, so they are renumbered above the highest existing id.
 */
export function osmXmlSerialize(graph: coreGraph): string {
  const all: OsmEntity[] = [];
  for (const id in graph.entities) {
    const entity = graph.hasEntity(<EntityId>id);   // `undefined` for entities deleted by the user
    if (entity) all.push(entity);
  }

  // renumber new objects, remember the mapping for refs inside ways / relations
  const remap = new Map<string, string>();
  const maxId: Record<string, number> = { node: 0, way: 0, relation: 0 };
  for (const e of all) {
    maxId[e.type] = Math.max(maxId[e.type], Number(osmIdManager.toOSM(e.id)));
  }
  for (const e of all) {
    const num = Number(osmIdManager.toOSM(e.id));
    remap.set(e.id, String(num < 0 ? ++maxId[e.type] : num));
  }
  const newRef = (type: string, id: string) => remap.get(id) ?? osmIdManager.toOSM(<EntityId>id);

  const doc = document.implementation.createDocument(null, 'osm');
  const root = doc.documentElement;
  root.setAttribute('version', '0.6');
  root.setAttribute('generator', 'iD (hackathon edition)');

  const order = { node: 0, way: 1, relation: 2 };
  all.sort((a, b) => order[a.type] - order[b.type] || Number(remap.get(a.id)) - Number(remap.get(b.id)));

  for (const e of all) {
    const el = doc.createElement(e.type);
    el.setAttribute('id', remap.get(e.id)!);
    el.setAttribute('visible', 'true');
    el.setAttribute('version', String(e.version || 1));

    if (e.type === 'node') {
      el.setAttribute('lat', String(e.loc[1]));
      el.setAttribute('lon', String(e.loc[0]));
    } else if (e.type === 'way') {
      e.nodes.forEach(n => {
        const nd = doc.createElement('nd');
        nd.setAttribute('ref', newRef('node', n));
        el.appendChild(nd);
      });
    } else if (e.type === 'relation') {
      e.members.forEach(m => {
        const member = doc.createElement('member');
        member.setAttribute('type', m.type);
        member.setAttribute('ref', newRef(m.type, m.id));
        member.setAttribute('role', m.role);
        el.appendChild(member);
      });
    }

    Object.keys(e.tags).sort().forEach(k => {
      const tag = doc.createElement('tag');
      tag.setAttribute('k', k);
      tag.setAttribute('v', e.tags[k]);
      el.appendChild(tag);
    });

    root.appendChild(doc.createTextNode('\n  '));
    root.appendChild(el);
  }
  root.appendChild(doc.createTextNode('\n'));

  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(doc);
}
