import { t } from '../../core/localizer';
import { svgIcon } from '../../svg';
import { uiCmd } from '../cmd';
import { uiTooltip } from '../tooltip';
import { modeBrowse, modeGpsTrack } from '../../modes';


export function uiToolGpsTrack(context) {

    var tool = {
        id: 'gps_track',
        label: t.append('gps_track.title')
    };

    var button = null;
    var tooltipBehavior = null;

    function toggle(d3_event) {
        d3_event.preventDefault();
        var currMode = context.mode();
        if (currMode && currMode.id === 'gps-track') {
            context.enter(modeBrowse(context));
        } else {
            context.enter(modeGpsTrack(context, {}));
        }
    }

    function isRecording() {
        var mode = context.mode();
        return mode && mode.id === 'gps-track' && mode.recording ? mode.recording() : false;
    }

    function trackCount() {
        var mode = context.mode();
        return mode && mode.id === 'gps-track' && mode.trackPoints ? mode.trackPoints() : 0;
    }

    tool.render = function(selection) {
        tooltipBehavior = uiTooltip()
            .placement('bottom')
            .title(() => isRecording()
                ? t('gps_track.stop_recording', { count: trackCount(), default: 'Остановить запись ({count} точек)' })
                : t('gps_track.start_recording', { default: 'Начать запись GPS-трека' }))
            .keys([uiCmd('G')])
            .scrollContainer(context.container().select('.top-toolbar'));

        button = selection
            .append('button')
            .attr('class', function() {
                return 'gps_track bar-button ' + (isRecording() ? 'recording' : '');
            })
            .on('click', toggle)
            .call(tooltipBehavior);

        button.call(svgIcon('#iD-icon-gps_track'));

        button.append('span')
            .attr('class', 'track-count')
            .attr('aria-hidden', 'true')
            .text(trackCount() || '0');

        context.keybinding()
            .on(uiCmd('G'), toggle, true);

        context
            .on('enter.gps_track_toolbar', update);

        update();
    };

    function update() {
        if (button) {
            button
                .classed('recording', isRecording())
                .classed('active', isRecording());
            button.select('span.track-count').text(trackCount() || '0');
        }
    }

    tool.uninstall = function() {
        context.keybinding().off(uiCmd('G'), true);
        context.on('enter.gps_track_toolbar', null);
        button = null;
        tooltipBehavior = null;
    };

    return tool;
}