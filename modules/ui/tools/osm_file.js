import { select as d3_select } from 'd3-selection';

import { t } from '../../core/localizer';
import { geoExtent } from '../../geo';
import { modeBrowse } from '../../modes/browse';
import { modeSelect } from '../../modes/select';
import { osmConnectivity, osmXmlParse, osmXmlSerialize } from '../../osm';
import { svgIcon } from '../../svg';
import { uiCmd } from '../cmd';
import { uiTooltip } from '../tooltip';


// Hackathon: replaces the "Save to OSM API" tool.
// The editor opens a local `.osm` file and writes the edited graph back to a `.osm` file.
export function uiToolOsmFile(context) {

    var tool = {
        id: 'osm_file',
        label: t.append('osm_file.title')
    };

    var _fileName = 'graph.osm';
    var _input = null;

    var commands = [{
        id: 'open',
        cmd: uiCmd('⌘O'),
        icon: 'iD-icon-load',
        action: function() { _input.node().click(); }
    }, {
        id: 'export',
        cmd: uiCmd('⌘S'),
        icon: 'iD-icon-save',
        action: exportFile
    }];


    function isBusy() {
        var mode = context.mode();
        return !mode || mode.id === 'save' || context.inIntro();
    }


    function openFile(file) {
        if (!file) return;

        if (context.history().hasChanges() && !window.confirm(t('osm_file.discard_changes'))) return;

        file.text()
            .then(function(text) {
                var entities = osmXmlParse(text);

                // start from a clean session, then use the file as the "base" graph (like downloaded tiles)
                context.enter(modeBrowse(context));
                context.reset();
                context.history().merge(entities);
                _fileName = file.name;

                var nodes = entities.filter(function(e) { return e.type === 'node'; });
                if (nodes.length) {
                    var extent = nodes.reduce(function(ext, node) {
                        return ext.extend(geoExtent(node.loc));
                    }, geoExtent(nodes[0].loc));
                    context.map().zoomToEase(extent, 0);
                }

                context.ui().flash
                    .duration(3000)
                    .iconName('#iD-icon-load')
                    .label(t.append('osm_file.opened', { count: entities.length }))();
            })
            .catch(function(err) {
                window.alert(t('osm_file.open_error', { message: err.message }));
            });
    }


    // Returns true when the graph is connected or the user agrees to export it anyway.
    // Otherwise the smallest isolated group of ways is selected, so the user can fix it.
    function confirmConnectivity() {
        var groups = osmConnectivity(context.graph());
        if (groups.length <= 1) return true;

        var isolated = groups.slice(1);
        var ways = isolated.reduce(function(sum, g) { return sum + g.length; }, 0);
        if (window.confirm(t('osm_file.isolated', { groups: isolated.length, ways: ways }))) return true;

        var smallest = groups[groups.length - 1];
        context.enter(modeSelect(context, smallest));
        context.map().zoomToEase(smallest.map(function(id) { return context.entity(id); }));
        return false;
    }


    function exportFile() {
        if (!confirmConnectivity()) return;

        var xml = osmXmlSerialize(context.graph());
        var blob = new Blob([xml], { type: 'application/xml' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = _fileName;
        link.click();
        URL.revokeObjectURL(link.href);
    }


    tool.render = function(selection) {
        var tooltipBehavior = uiTooltip()
            .placement('bottom')
            .title(function(d) { return t.append('osm_file.' + d.id + '.tooltip'); })
            .keys(function(d) { return [d.cmd]; })
            .scrollContainer(context.container().select('.top-toolbar'));

        _input = selection
            .append('input')
            .attr('type', 'file')
            .attr('accept', '.osm,.xml')
            .style('display', 'none')
            .on('change', function(d3_event) {
                openFile(d3_event.target.files[0]);
                d3_event.target.value = '';   // allow opening the same file again
            });

        var buttons = selection.selectAll('button')
            .data(commands)
            .enter()
            .append('button')
            .attr('class', function(d) { return d.id + '-button bar-button'; })
            .on('click', function(d3_event, d) {
                d3_event.preventDefault();
                if (!isBusy()) d.action();
            })
            .call(tooltipBehavior);

        buttons.each(function(d) {
            d3_select(this).call(svgIcon('#' + d.icon));
        });

        commands.forEach(function(d) {
            context.keybinding().on(d.cmd, function(d3_event) {
                d3_event.preventDefault();
                if (!isBusy()) d.action();
            }, true);
        });
    };


    tool.uninstall = function() {
        commands.forEach(function(d) { context.keybinding().off(d.cmd, true); });
        _input = null;
    };

    return tool;
}
