describe('iD.osmXml', function () {
    var xml = '<?xml version="1.0" encoding="UTF-8"?>' +
        '<osm version="0.6">' +
        '<node id="1" lat="52.28" lon="104.28" version="2"><tag k="highway" v="traffic_signals"/></node>' +
        '<node id="2" lat="52.29" lon="104.29"/>' +
        '<way id="10" version="3"><nd ref="1"/><nd ref="2"/><tag k="highway" v="residential"/><tag k="name" v="A &amp; B"/></way>' +
        '<relation id="20"><member type="way" ref="10" role="outer"/><tag k="type" v="multipolygon"/></relation>' +
        '</osm>';

    describe('#osmXmlParse', function () {
        it('parses nodes, ways and relations', function () {
            var entities = iD.osmXmlParse(xml);
            expect(entities.map(function (e) { return e.id; })).toEqual(['n1', 'n2', 'w10', 'r20']);
            expect(entities[0].loc).toEqual([104.28, 52.28]);
            expect(entities[0].tags).toEqual({ highway: 'traffic_signals' });
            expect(entities[2].nodes).toEqual(['n1', 'n2']);
            expect(entities[2].tags.name).toEqual('A & B');
            expect(entities[3].members).toEqual([{ id: 'w10', type: 'way', role: 'outer' }]);
        });

        it('throws on a file which is not OSM XML', function () {
            expect(function () { iD.osmXmlParse('<gpx></gpx>'); }).toThrow();
            expect(function () { iD.osmXmlParse('not xml'); }).toThrow();
        });
    });

    describe('#osmXmlSerialize', function () {
        it('round-trips a graph', function () {
            var graph = new iD.coreGraph(iD.osmXmlParse(xml));
            var again = iD.osmXmlParse(iD.osmXmlSerialize(graph));
            expect(again.map(function (e) { return e.id; })).toEqual(['n1', 'n2', 'w10', 'r20']);
            expect(again[2].tags.name).toEqual('A & B');
        });

        it('renumbers new objects to positive ids and skips deleted ones', function () {
            var graph = new iD.coreGraph(iD.osmXmlParse(xml));
            var created = new iD.osmNode({ id: 'n-1', loc: [104.3, 52.3], tags: { railway: 'signal' } });
            graph = graph.replace(created).remove(graph.entity('n2'));
            var result = iD.osmXmlParse(iD.osmXmlSerialize(graph));
            var ids = result.map(function (e) { return e.id; });
            var signal = result.find(function (e) { return e.tags.railway === 'signal'; });
            expect(signal.id).toEqual('n2');   // highest remaining node id is 1, so the new node gets 2
            expect(ids).not.toContain('n-1');
            expect(result.filter(function (e) { return e.loc && e.loc[0] === 104.29; })).toEqual([]);   // deleted node is gone
        });
    });
});

describe('iD.osmConnectivity', function () {
    function way(id, nodes, highway) {
        return new iD.osmWay({ id: id, nodes: nodes, tags: { highway: highway || 'residential' } });
    }

    it('returns one group for a connected network', function () {
        var graph = new iD.coreGraph([way('w1', ['n1', 'n2']), way('w2', ['n2', 'n3'])]);
        expect(iD.osmConnectivity(graph)).toEqual([['w1', 'w2']]);
    });

    it('finds isolated groups, biggest first, and ignores footways', function () {
        var graph = new iD.coreGraph([
            way('w1', ['n1', 'n2']), way('w2', ['n2', 'n3']),
            way('w3', ['n10', 'n11']),
            way('w4', ['n3', 'n20'], 'footway')
        ]);
        expect(iD.osmConnectivity(graph)).toEqual([['w1', 'w2'], ['w3']]);
    });
});
