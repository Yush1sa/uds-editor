import { t } from '../core/localizer';
import { behaviorDraw } from '../behavior/draw';
import { modeBrowse } from './browse';
import { modeSelect } from './select';
import { osmNode } from '../osm/node';
import { osmWay } from '../osm/way';
import { actionAddEntity } from '../actions/add_entity';
import { actionAddMidpoint } from '../actions/add_midpoint';
import { actionChangeTags } from '../actions/change_tags';


export function modeGpsTrack(context, mode) {

    mode.id = 'gps-track';
    mode.button = 'gps_track';

    var _track = [];
    var _trackWay = null;
    var _recording = false;
    var _watchId = null;
    var _lastLoc = null;
    var _minDistance = 5; // minimum distance in meters between points

    var behavior = behaviorDraw(context)
        .on('click', startStop)
        .on('cancel', stop)
        .on('finish', stop);

    function startStop() {
        if (_recording) {
            stop();
        } else {
            start();
        }
    }

    function start() {
        if (!navigator.geolocation) {
            context.ui().flash
                .duration(3000)
                .iconName('#iD-icon-alert')
                .label(t('gps_track.no_geolocation', { default: 'Геолокация не поддерживается браузером' }))();
            return;
        }

        _recording = true;
        _track = [];
        _trackWay = null;
        _lastLoc = null;

        context.enter(modeSelect(context, [])); // clear selection

        _watchId = navigator.geolocation.watchPosition(
            onPosition,
            onError,
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 10000
            }
        );

        context.ui().flash
            .duration(2000)
            .iconName('#iD-icon-record')
            .label(t('gps_track.started', { default: 'Запись GPS-трека начата' }))();
    }

    function stop() {
        _recording = false;
        if (_watchId !== null) {
            navigator.geolocation.clearWatch(_watchId);
            _watchId = null;
        }

        if (_track.length > 1) {
            saveTrack();
        }

        context.enter(modeBrowse(context));
        context.ui().flash
            .duration(3000)
            .iconName('#iD-icon-save')
            .label(t('gps_track.saved', { count: _track.length, default: 'GPS-трек сохранён ({count} точек)' }))();
    }

    function onPosition(pos) {
        var loc = [pos.coords.longitude, pos.coords.latitude];

        // Filter out points that are too close together
        if (_lastLoc) {
            var dist = Math.sqrt(
                Math.pow(loc[0] - _lastLoc[0], 2) +
                Math.pow(loc[1] - _lastLoc[1], 2)
            );
            // Rough distance check in degrees (approx 111km per degree)
            if (dist < _minDistance / 111000) return;
        }

        _lastLoc = loc;
        _track.push(loc);

        // Add point to map
        var node = new osmNode({ loc: loc, tags: {} });
        context.perform(
            actionAddEntity(node),
            t('operations.add.annotation.point')
        );

        // Create or extend the track way
        if (!_trackWay) {
            _trackWay = new osmWay({ nodes: [node.id], tags: {} });
            context.perform(
                actionAddEntity(_trackWay),
                t('operations.add.annotation.line')
            );
        } else {
            context.perform(
                actionAddMidpoint({ loc: loc, edge: _trackWay }, node),
                t('operations.add.annotation.vertex')
            );
        }
    }

    function onError(err) {
        context.ui().flash
            .duration(3000)
            .iconName('#iD-icon-alert')
            .label(t('gps_track.error', { message: err.message, default: 'Ошибка GPS: {message}' }))();
        stop();
    }

    function saveTrack() {
        // Tag the track way as a GPS track
        var tags = {
            type: 'gps_track',
            created: new Date().toISOString(),
            points: _track.length.toString()
        };
        context.perform(
            actionChangeTags(_trackWay.id, tags),
            t('operations.change_tags.annotation')
        );
    }

    mode.recording = function() { return _recording; };
    mode.trackPoints = function() { return _track.length; };

    mode.enter = function() {
        context.install(behavior);
    };

    mode.exit = function() {
        context.uninstall(behavior);
        if (_recording) stop();
    };

    return mode;
}